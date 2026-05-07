const fs = require('fs');
let c = fs.readFileSync('src/pages/maintenance/MaintenanceDashboard.jsx', 'utf8');
c = c.replace(/<label.*?Cliquez.*?<\/label>/s, `{photoRap ? (
  <div className="relative w-full h-40 rounded-xl overflow-hidden mb-4 border border-neutral-200">
    <img src={photoRap} className="w-full h-full object-cover" alt="Preuve" />
    <Button 
      className="absolute top-2 right-2 bg-red-600/80 hover:bg-red-600 text-white" 
      size="sm" 
      onClick={(e) => { e.preventDefault(); setPhotoRap('');}}>
      Retirer
    </Button>
  </div>
) : (
  <button type="button" onClick={() => setIsCameraOpen(true)} className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-neutral-300 rounded-xl cursor-pointer bg-neutral-50 hover:bg-neutral-100 transition-colors">
    <div className="flex flex-col items-center justify-center pt-5 pb-6">
      <Camera className="w-8 h-8 mb-3 text-neutral-400" />
      <p className="mb-2 text-sm text-neutral-500 font-bold"><span className="text-neutral-700">Cliquez</span> pour prendre la photo de validation</p>
    </div>
  </button>
)}`);
fs.writeFileSync('src/pages/maintenance/MaintenanceDashboard.jsx', c);
