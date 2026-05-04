import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import 'jspdf-autotable';

const formatNumber = (num) => {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

let arabicFontBase64 = null;
let arabicBoldFontBase64 = null;

const loadArabicFonts = async (pdf) => {
  const fetchFontAsBase64 = async (url) => {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = '';
    const chunk = 4096;
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
    }
    return btoa(binary);
  };

  if (!arabicFontBase64) {
    arabicFontBase64 = await fetchFontAsBase64('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Regular.ttf');
  }
  if (!arabicBoldFontBase64) {
    arabicBoldFontBase64 = await fetchFontAsBase64('https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSansArabic/NotoSansArabic-Bold.ttf');
  }

  pdf.addFileToVFS('NotoSansArabic-Regular.ttf', arabicFontBase64);
  pdf.addFont('NotoSansArabic-Regular.ttf', 'NotoSansArabic', 'normal');
  
  pdf.addFileToVFS('NotoSansArabic-Bold.ttf', arabicBoldFontBase64);
  pdf.addFont('NotoSansArabic-Bold.ttf', 'NotoSansArabic', 'bold');
};

export const generateBadgePDF = async (client, chambreNum, formule, dateDepart) => {
  const doc = new jsPDF('p', 'mm', [85.6, 54]); // CR-80 card size landscape, or 85.6x54 is portrait if we flip width/height. Wait, "p" is portrait. 54x85.6.
  // Actually standard CR80 is 54mm x 86mm (portrait).
  const pdf = new jsPDF('p', 'mm', [54, 86]);

  await loadArabicFonts(pdf);

  pdf.setFillColor(6, 78, 59); // emerald-800
  pdf.rect(0, 0, 54, 15, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('NotoSansArabic', 'bold');
  pdf.text(pdf.processArabic('VILLAGE OLYMPIQUE'), 27, 8, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setFont('NotoSansArabic', 'normal');
  pdf.text(pdf.processArabic('NAPOLI 2026'), 27, 12, { align: 'center' });

  // Photo
  let cursorY = 20;
  if (client.photo_selfie) {
    try {
      pdf.addImage(client.photo_selfie, 'JPEG', 17, cursorY, 20, 20);
      cursorY += 25;
    } catch (e) {
      console.warn("Could not add photo to PDF", e);
    }
  }

  // Name
  pdf.setTextColor(15, 23, 42); // slate-900
  pdf.setFont('NotoSansArabic', 'bold');
  pdf.setFontSize(14);
  const nameText1 = client.nom.toUpperCase();
  const nameText2 = client.prenom.toUpperCase();
  pdf.text(pdf.processArabic(nameText1), 27, cursorY, { align: 'center' });
  pdf.text(pdf.processArabic(nameText2), 27, cursorY + 6, { align: 'center' });
  cursorY += 12;

  if (client.est_mineur === 1) {
    pdf.setFillColor(220, 38, 38); // red-600
    pdf.rect(17, cursorY - 4, 20, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('NotoSansArabic', 'normal');
    pdf.setFontSize(8);
    pdf.text(pdf.processArabic('MINEUR'), 27, cursorY - 0.5, { align: 'center' });
    cursorY += 4;
  }

  // Room
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(22);
  pdf.setFont('helvetica', 'bold');
  pdf.text(chambreNum, 27, cursorY + 6, { align: 'center' });
  
  pdf.setFontSize(7);
  pdf.setFont('NotoSansArabic', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text(pdf.processArabic('CHAMBRE'), 27, cursorY + 10, { align: 'center' });
  cursorY += 15;

  // Formule / Sang / Depart
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.rect(3, cursorY, 48, 15, 'F');
  
  pdf.setFontSize(6);
  pdf.setFont('NotoSansArabic', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(pdf.processArabic('FORMULE:'), 5, cursorY + 4);
  pdf.setTextColor(4, 120, 87);
  pdf.setFont('helvetica', 'bold');
  pdf.text(formule || 'N/A', 50, cursorY + 4, { align: 'right' });

  pdf.setFont('NotoSansArabic', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(pdf.processArabic('SANG:'), 5, cursorY + 8);
  pdf.setTextColor(220, 38, 38);
  pdf.setFont('helvetica', 'bold');
  pdf.text(client.groupe_sanguin || 'N/A', 50, cursorY + 8, { align: 'right' });

  pdf.setFont('NotoSansArabic', 'normal');
  pdf.setTextColor(71, 85, 105);
  pdf.text(pdf.processArabic('DEP.:'), 5, cursorY + 12);
  pdf.setTextColor(15, 23, 42);
  pdf.setFont('helvetica', 'bold');
  pdf.text(new Date(dateDepart).toLocaleDateString('fr-FR'), 50, cursorY + 12, { align: 'right' });

  // QR Code Generation
  try {
     const qrData = JSON.stringify({
       id: client.nin || client.num_piece,
       nom: client.nom,
       chambre: chambreNum
     });
     const qrCanvas = document.createElement('canvas');
     await QRCode.toCanvas(qrCanvas, qrData, { margin: 0 });
     pdf.addImage(qrCanvas.toDataURL('image/png'), 'PNG', 40, 72, 12, 12);
  } catch (e) {
     console.error('Error generating QR', e);
  }

  pdf.save(`Badge_${client.nom}_Ch${chambreNum}.pdf`);
};

export const generateReceiptPDF = async (client, reservationInfo) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  await loadArabicFonts(pdf);
  
  pdf.setFontSize(18);
  pdf.setFont('NotoSansArabic', 'bold');
  pdf.text(pdf.processArabic('RECU DE PAIEMENT'), 105, 20, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('NotoSansArabic', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text(pdf.processArabic('VILLAGE OLYMPIQUE NAPOLI 2026'), 105, 26, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  const clientNameText = `Client : ${client.nom} ${client.prenom}`;
  
  pdf.setFontSize(12);
  pdf.setFont('NotoSansArabic', 'normal');
  pdf.text(pdf.processArabic(clientNameText), 20, 40);
  
  pdf.setFont('NotoSansArabic', 'normal');
  pdf.text(pdf.processArabic(`ID : ${client.est_etranger ? client.num_piece : client.nin}`), 20, 46);
  
  pdf.text(pdf.processArabic(`Date : ${new Date().toLocaleDateString('fr-FR')}`), 190, 40, { align: 'right' });
  pdf.text(pdf.processArabic(`Réservation N° : ${reservationInfo.reservationId || reservationInfo.id}`), 190, 46, { align: 'right' });
  
  pdf.line(20, 52, 190, 52);

  const tableData = [];
  if (reservationInfo.nuits) {
    if (reservationInfo.total_nuit > 0) {
      tableData.push([
        pdf.processArabic(`Hébergement (${reservationInfo.nuits} nuit(s) - Chambre ${reservationInfo.chambreNum || reservationInfo.chambre})`),
        `${formatNumber(reservationInfo.total_nuit)} DZD`
      ]);
    }
    if (reservationInfo.total_repas > 0) {
      tableData.push([
        pdf.processArabic(`Restauration (Formule ${reservationInfo.formule || 'N/A'} - ${reservationInfo.nuits} jour(s))`),
        `${formatNumber(reservationInfo.total_repas)} DZD`
      ]);
    }
  }

  pdf.autoTable({
    startY: 60,
    head: [[pdf.processArabic('Description'), pdf.processArabic('Montant')]],
    body: tableData,
    theme: 'grid',
    styles: { font: 'NotoSansArabic' },
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } }
  });

  let finalY = pdf.lastAutoTable.finalY + 10;
  
  pdf.setFont('NotoSansArabic', 'bold');
  pdf.setFontSize(12);
  pdf.text(pdf.processArabic('TOTAL A PAYER'), 130, finalY);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${formatNumber(reservationInfo.total || reservationInfo.total_theorique)} DZD`, 190, finalY, { align: 'right' });
  
  if (reservationInfo.montant_encaisse !== undefined) {
    finalY += 8;
    pdf.setTextColor(4, 120, 87); // emerald-700
    pdf.setFont('NotoSansArabic', 'bold');
    pdf.text(pdf.processArabic('MONTANT ENCAISSÉ'), 130, finalY);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${formatNumber(reservationInfo.montant_encaisse || 0)} DZD`, 190, finalY, { align: 'right' });
    
    finalY += 8;
    const reste = (reservationInfo.total || reservationInfo.total_theorique) - (reservationInfo.montant_encaisse || 0);
    if (reste > 0) {
      pdf.setTextColor(220, 38, 38); // red-600
    } else {
      pdf.setTextColor(0, 0, 0); 
    }
    pdf.setFont('NotoSansArabic', 'bold');
    pdf.text(pdf.processArabic('RESTE A PAYER'), 130, finalY);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${formatNumber(reste)} DZD`, 190, finalY, { align: 'right' });
  }

  finalY += 30;
  pdf.setFont('NotoSansArabic', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  pdf.text(pdf.processArabic('Ceci est une attestation officielle délivrée par le Village Olympique Napoli 2026.'), 105, finalY, { align: 'center' });

  pdf.save(`Recu_${client.nom}_Ch${reservationInfo.chambreNum || reservationInfo.chambre}.pdf`);
};
