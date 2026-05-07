import jsPDF from 'jspdf';
import 'jspdf-autotable';

export const generateBilan = (agent, data, onClose) => {
  const { interventions, achats } = data;
  if (!interventions || interventions.length === 0) {
    alert("Aucune intervention à télécharger pour l'instant.");
    if(onClose) onClose();
    return;
  }

  const doc = new jsPDF();
  const title = `Bilan des Interventions - ${agent.nom} ${agent.prenom}`;
  
  doc.setFontSize(18);
  doc.text(title, 14, 22);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text(`Date brute: ${new Date().toLocaleString('fr-FR')}`, 14, 30);

  let startY = 40;

  interventions.forEach((inv, index) => {
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.setFont("helvetica", "bold");
    const invTitle = `Intervention #${inv.id} - ${inv.chambre_numero ? 'Chambre '+inv.chambre_numero : inv.localisation} (${inv.type_panne || 'Technique'})`;
    doc.text(invTitle, 14, startY);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const yOffsets = startY + 6;
    doc.text(`Description: ${inv.description}`, 14, yOffsets);
    doc.text(`Rapport: ${inv.rapport || 'N/A'}`, 14, yOffsets + 5);
    doc.text(`Fin des travaux: ${new Date(inv.date_resolution).toLocaleString('fr-FR')}`, 14, yOffsets + 10);

    const invAchats = achats.filter(a => a.maintenance_id === inv.id);

    if (invAchats.length > 0) {
      const tableData = invAchats.map(a => [
        a.designation,
        a.quantite,
        new Date(a.created_at).toLocaleString('fr-FR'), // horodatage demande
        a.date_resolution ? new Date(a.date_resolution).toLocaleString('fr-FR') : (a.updated_at ? new Date(a.updated_at).toLocaleString('fr-FR') : 'Non disponible') // disponibilité
      ]);

      doc.autoTable({
        startY: yOffsets + 15,
        head: [['Désignation / Pièce', 'Qté', 'Demande le', 'Disponibilité']],
        body: tableData,
        theme: 'striped',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [230, 80, 0] },
        margin: { left: 14 }
      });
      startY = doc.lastAutoTable.finalY + 15;
    } else {
      startY = yOffsets + 20;
    }

    if (startY > 270) {
      doc.addPage();
      startY = 20;
    }
  });

  // Footer: Signatures
  if (startY > 230) {
    doc.addPage();
    startY = 20;
  } else {
    startY += 10;
  }

  doc.setFont("helvetica", "bold");
  doc.text("Signature de l'Agent", 30, startY);
  doc.text("Signature Chef Unité", 130, startY);

  // Boxes
  doc.setDrawColor(150);
  doc.rect(20, startY + 5, 60, 30);
  doc.rect(120, startY + 5, 60, 30);

  doc.save(`Bilan_Maintenance_${agent.matricule}.pdf`);
  if(onClose) onClose();
};
