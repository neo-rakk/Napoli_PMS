import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import 'jspdf-autotable';

export const generateBadgePDF = async (client, chambreNum, formule, dateDepart) => {
  const doc = new jsPDF('p', 'mm', [85.6, 54]); // CR-80 card size landscape, or 85.6x54 is portrait if we flip width/height. Wait, "p" is portrait. 54x85.6.
  // Actually standard CR80 is 54mm x 86mm (portrait).
  const pdf = new jsPDF('p', 'mm', [54, 86]);

  pdf.setFillColor(6, 78, 59); // emerald-800
  pdf.rect(0, 0, 54, 15, 'F');
  
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('VILLAGE OLYMPIQUE', 27, 8, { align: 'center' });
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'normal');
  pdf.text('NAPOLI 2026', 27, 12, { align: 'center' });

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
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  const nameText = `${client.nom}\n${client.prenom}`.toUpperCase();
  pdf.text(nameText, 27, cursorY, { align: 'center' });
  cursorY += 10;

  if (client.est_mineur === 1) {
    pdf.setFillColor(220, 38, 38); // red-600
    pdf.rect(17, cursorY - 4, 20, 5, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('MINEUR', 27, cursorY - 0.5, { align: 'center' });
    cursorY += 4;
  }

  // Room
  pdf.setTextColor(15, 23, 42);
  pdf.setFontSize(22);
  pdf.setFont('courier', 'bold');
  pdf.text(chambreNum, 27, cursorY + 6, { align: 'center' });
  
  pdf.setFontSize(7);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(100, 116, 139);
  pdf.text('CHAMBRE', 27, cursorY + 10, { align: 'center' });
  cursorY += 15;

  // Formule / Sang / Depart
  pdf.setFillColor(248, 250, 252); // slate-50
  pdf.rect(3, cursorY, 48, 15, 'F');
  
  pdf.setFontSize(6);
  pdf.setTextColor(71, 85, 105);
  pdf.text('FORMULE:', 5, cursorY + 4);
  pdf.setTextColor(4, 120, 87);
  pdf.text(formule || 'N/A', 50, cursorY + 4, { align: 'right' });

  pdf.setTextColor(71, 85, 105);
  pdf.text('SANG:', 5, cursorY + 8);
  pdf.setTextColor(220, 38, 38);
  pdf.text(client.groupe_sanguin || 'N/A', 50, cursorY + 8, { align: 'right' });

  pdf.setTextColor(71, 85, 105);
  pdf.text('DEP.:', 5, cursorY + 12);
  pdf.setTextColor(15, 23, 42);
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

export const generateReceiptPDF = (client, reservationInfo) => {
  const pdf = new jsPDF('p', 'mm', 'a4');
  
  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.text('RECU DE PAIEMENT', 105, 20, { align: 'center' });
  
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(100, 100, 100);
  pdf.text('VILLAGE OLYMPIQUE NAPOLI 2026', 105, 26, { align: 'center' });
  
  pdf.setTextColor(0, 0, 0);
  pdf.text(`Client : ${client.nom} ${client.prenom}`, 20, 40);
  pdf.text(`ID : ${client.est_etranger ? client.num_piece : client.nin}`, 20, 46);
  
  pdf.text(`Date : ${new Date().toLocaleDateString('fr-FR')}`, 190, 40, { align: 'right' });
  pdf.text(`Réservation N° : ${reservationInfo.reservationId || reservationInfo.id}`, 190, 46, { align: 'right' });
  
  pdf.line(20, 52, 190, 52);

  const tableData = [];
  if (reservationInfo.nuits) {
    if (reservationInfo.total_nuit > 0) {
      tableData.push([
        `Hébergement (${reservationInfo.nuits} nuit(s) - Chambre ${reservationInfo.chambreNum || reservationInfo.chambre})`,
        `${(reservationInfo.total_nuit).toLocaleString()} DZD`
      ]);
    }
    if (reservationInfo.total_repas > 0) {
      tableData.push([
        `Restauration (Formule ${reservationInfo.formule || 'N/A'} - ${reservationInfo.nuits} jour(s))`,
        `${(reservationInfo.total_repas).toLocaleString()} DZD`
      ]);
    }
  }

  pdf.autoTable({
    startY: 60,
    head: [['Description', 'Montant']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [241, 245, 249], textColor: [71, 85, 105], fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' } }
  });

  let finalY = pdf.lastAutoTable.finalY + 10;
  
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('TOTAL A PAYER', 130, finalY);
  pdf.text(`${(reservationInfo.total || reservationInfo.total_theorique).toLocaleString()} DZD`, 190, finalY, { align: 'right' });
  
  if (reservationInfo.montant_encaisse !== undefined) {
    finalY += 8;
    pdf.setTextColor(4, 120, 87); // emerald-700
    pdf.text('MONTANT ENCAISSÉ', 130, finalY);
    pdf.text(`${(reservationInfo.montant_encaisse || 0).toLocaleString()} DZD`, 190, finalY, { align: 'right' });
    
    finalY += 8;
    const reste = (reservationInfo.total || reservationInfo.total_theorique) - (reservationInfo.montant_encaisse || 0);
    if (reste > 0) {
      pdf.setTextColor(220, 38, 38); // red-600
    } else {
      pdf.setTextColor(0, 0, 0); 
    }
    pdf.text('RESTE A PAYER', 130, finalY);
    pdf.text(`${reste.toLocaleString()} DZD`, 190, finalY, { align: 'right' });
  }

  pdf.save(`Recu_${client.nom}_Ch${reservationInfo.chambreNum || reservationInfo.chambre}.pdf`);
};
