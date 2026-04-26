import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { CheckCircle } from 'lucide-react';

export default function PublicInscription() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    est_etranger: 0,
    nom: '', prenom: '',
    nin: '',
    type_piece: '', num_piece: '', nationalite: 'DZ',
    date_naissance: '', lieu_naissance: '',
    adresse_residence: '', sexe: 'M', groupe_sanguin: 'ND',
    tuteur_nom: '', tuteur_contact: '',
    formule: '',
    photo_selfie: null, photo_piece_recto: null, photo_piece_verso: null
  });
  const [error, setError] = useState('');
  const [dossierInfo, setDossierInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateAge = (dob) => {
    if (!dob) return 18;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.abs(new Date(diff).getUTCFullYear() - 1970);
  };

  const isMineur = calculateAge(formData.date_naissance) < 18;

  const handleNext = () => setStep(step + 1);
  const handlePrev = () => setStep(step - 1);

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const payload = { ...formData, est_mineur: isMineur ? 1 : 0 };
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de la soumission');
      
      setDossierInfo(data);
      setStep(5);
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (step === 5 && dossierInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl max-w-md w-full border border-emerald-100">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-inner">
            <CheckCircle size={48} />
          </div>
          
          <div className="bg-emerald-900 p-8 rounded-[2rem] mb-10 shadow-lg shadow-emerald-900/20 relative overflow-hidden">
            <h2 className="text-[10px] text-emerald-400 uppercase font-black tracking-[0.2em] mb-2 relative z-10">Numéro de dossier</h2>
            <p className="text-4xl font-black text-white tracking-tighter relative z-10 font-mono">
              {dossierInfo.dossier}
            </p>
          </div>
          
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
            <p className="text-sm text-amber-800 font-bold italic leading-tight">
              Présentez ce numéro à la réception lors de votre arrivée.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#064e3b] flex flex-col items-center p-4 selection:bg-emerald-400 selection:text-emerald-950">
      
      <div className="w-full max-w-2xl flex justify-between items-center py-8 text-white">
        <div>
          <h1 className="text-3xl font-black uppercase tracking-widest leading-none mb-1">Village Napoli</h1>
          <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em]">Inscription Visiteur</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </div>

      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden mb-12 border border-white/20">
        
        <div className="bg-slate-100 w-full h-2.5">
           <div className="bg-emerald-500 h-2.5 transition-all duration-500 ease-out" style={{ width: `${(step / 4) * 100}%` }}></div>
        </div>

        <div className="p-8 md:p-12">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-6">1. Identité</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <label className={`flex items-center gap-4 p-6 rounded-3xl border-2 cursor-pointer transition-all ${formData.est_etranger === 0 ? 'bg-emerald-50 border-emerald-500 shadow-emerald-100 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.est_etranger === 0 ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}></div>
                  <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Algérien</span>
                  <input type="radio" className="hidden" name="etr" checked={formData.est_etranger === 0} onChange={() => setFormData({...formData, est_etranger: 0})} />
                </label>
                <label className={`flex items-center gap-4 p-6 rounded-3xl border-2 cursor-pointer transition-all ${formData.est_etranger === 1 ? 'bg-emerald-50 border-emerald-500 shadow-emerald-100 shadow-lg' : 'bg-slate-50 border-slate-100'}`}>
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${formData.est_etranger === 1 ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}></div>
                  <span className="text-sm font-black text-slate-700 uppercase tracking-tight">Étranger</span>
                  <input type="radio" className="hidden" name="etr" checked={formData.est_etranger === 1} onChange={() => setFormData({...formData, est_etranger: 1})} />
                </label>
              </div>

              {formData.est_etranger === 0 ? (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIN (18 chiffres)</label>
                  <input type="text" className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300" value={formData.nin} onChange={e => setFormData({...formData, nin: e.target.value})} maxLength={18} />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de pièce</label>
                    <select className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all" value={formData.type_piece} onChange={e => setFormData({...formData, type_piece: e.target.value})}>
                      <option value="">Sélectionner</option>
                      <option value="passeport">Passeport</option>
                      <option value="carte_id">Carte d'Identité</option>
                      <option value="titre_sejour">Titre de séjour</option>
                      <option value="laissez_passer">Laissez-passer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label>
                    <input type="text" className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300" value={formData.num_piece} onChange={e => setFormData({...formData, num_piece: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300 uppercase" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all" value={formData.date_naissance} onChange={e => setFormData({...formData, date_naissance: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
                  <input type="text" className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300" value={formData.lieu_naissance} onChange={e => setFormData({...formData, lieu_naissance: e.target.value})} />
                </div>
              </div>

              {isMineur && formData.date_naissance && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] mt-6 space-y-4 shadow-sm">
                  <div className="flex items-center gap-2 text-[10px] font-bold text-amber-800 uppercase leading-relaxed mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Client Mineur
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du tuteur</label>
                    <input type="text" className="w-full px-4 h-12 border-2 border-amber-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-slate-800 bg-white transition-all" value={formData.tuteur_nom} onChange={e => setFormData({...formData, tuteur_nom: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact tuteur</label>
                    <input type="text" className="w-full px-4 h-12 border-2 border-amber-100 rounded-2xl focus:border-amber-500 focus:outline-none font-bold text-slate-800 bg-white transition-all" value={formData.tuteur_contact} onChange={e => setFormData({...formData, tuteur_contact: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cité / Adresse</label>
                  <input type="text" className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all placeholder:font-normal placeholder:text-slate-300" value={formData.adresse_residence} onChange={e => setFormData({...formData, adresse_residence: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Groupe Sanguin</label>
                  <select className="w-full px-4 h-12 border-2 border-slate-100 rounded-2xl focus:border-emerald-500 focus:outline-none font-bold text-slate-800 bg-white transition-all" value={formData.groupe_sanguin} onChange={e => setFormData({...formData, groupe_sanguin: e.target.value})}>
                    {['ND','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-12">
                <Button className="h-16 px-12 rounded-2xl font-black uppercase tracking-widest text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/10 w-full md:w-auto" onClick={handleNext} disabled={!formData.nom || !formData.prenom}>Suivant</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-6">2. Formule de séjour</h2>
              <div className="space-y-4">
                {[
                  { id: 'PD', title: 'Petit Déjeuner (PD)', desc: 'Nuitée + Petit Déjeuner inclus.' },
                  { id: 'DP', title: 'Demi-Pension (DP)', desc: 'Nuitée + Petit Déjeuner + Déjeuner ou Dîner.' },
                  { id: 'PC', title: 'Pension Complète (PC)', desc: 'Nuitée + Les 3 repas inclus.' }
                ].map(f => (
                  <label key={f.id} className={`group block p-8 border-2 rounded-[2rem] cursor-pointer transition-all ${formData.formule === f.id ? 'border-emerald-500 bg-emerald-50 shadow-emerald-100 shadow-xl' : 'border-slate-100 bg-slate-50/50 hover:border-emerald-200'}`}>
                    <div className="flex items-center gap-6">
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${formData.formule === f.id ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}></div>
                      <div>
                        <div className={`font-black text-xl uppercase tracking-tighter transition-colors ${formData.formule === f.id ? 'text-emerald-800' : 'text-slate-800'}`}>{f.title}</div>
                        <div className="text-sm font-medium text-slate-500 mt-1">{f.desc}</div>
                      </div>
                    </div>
                    <input type="radio" className="hidden" name="formule" checked={formData.formule === f.id} onChange={() => setFormData({...formData, formule: f.id})} />
                  </label>
                ))}
              </div>
              <div className="flex gap-4 mt-12 w-full">
                <Button className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-slate-100 hover:bg-slate-200 text-slate-600" onClick={handlePrev}>Retour</Button>
                <Button className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/10" onClick={handleNext} disabled={!formData.formule}>Suivant</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-4">3. Photos & Captures</h2>
              <p className="text-slate-500 mb-8 font-medium">Afin de compléter votre identification, nous avons besoin de 3 photos. Ces photos seront requises pour la validation à la réception.</p>
              
              <div className="space-y-4">
                {['photo_selfie', 'photo_piece_recto', 'photo_piece_verso'].map(id => (
                  <div key={id} className={`p-6 rounded-3xl border-2 flex items-center justify-between transition-colors ${formData[id] ? 'bg-emerald-50 border-emerald-500 shadow-md' : 'bg-slate-50 border-slate-100'}`}>
                    <div>
                      <h4 className={`font-black uppercase tracking-tight text-lg mb-1 ${formData[id] ? 'text-emerald-800' : 'text-slate-800'}`}>
                        {id === 'photo_selfie' ? 'Selfie' : id === 'photo_piece_recto' ? 'Pièce (Recto)' : 'Pièce (Verso)'}
                      </h4>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        {formData[id] ? 'Capturé avec succès' : 'Non fourni'}
                      </p>
                    </div>
                    <div className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer transition-colors shadow-sm ${formData[id] ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                      onClick={() => setFormData({...formData, [id]: 'simulated-base64'})}>
                      {formData[id] ? 'Refaire' : 'Prendre'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 mt-12 w-full">
                <Button className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-slate-100 hover:bg-slate-200 text-slate-600" onClick={handlePrev}>Retour</Button>
                <Button className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/10" onClick={handleNext} disabled={!formData.photo_selfie || !formData.photo_piece_recto || !formData.photo_piece_verso}>Suivant</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-4 duration-500">
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter mb-6">4. Confirmation</h2>
              <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between border-b border-white pb-3">
                  <span className="text-slate-500 font-medium">Nom Complet</span>
                  <span className="font-black text-slate-800 uppercase">{formData.nom} {formData.prenom}</span>
                </div>
                <div className="flex justify-between border-b border-white pb-3">
                  <span className="text-slate-500 font-medium">Identité</span>
                  <span className="font-bold text-slate-700">{formData.est_etranger ? formData.num_piece : formData.nin}</span>
                </div>
                <div className="flex justify-between border-b border-white pb-3">
                  <span className="text-slate-500 font-medium">Formule</span>
                  <span className="font-bold text-emerald-600">{formData.formule}</span>
                </div>
                {isMineur && (
                   <div className="flex justify-between border-b border-white pb-3">
                     <span className="text-slate-500 font-medium">Tuteur légal</span>
                     <span className="font-black text-amber-700">{formData.tuteur_nom}</span>
                   </div>
                )}
              </div>

              <div className="mt-8 flex gap-4 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                <input type="checkbox" id="cert" className="w-6 h-6 rounded text-emerald-600 border-slate-300 focus:ring-emerald-500 mt-1" />
                <label htmlFor="cert" className="text-sm font-medium text-slate-600 leading-relaxed cursor-pointer">
                  Je certifie sur l'honneur l'exactitude des informations fournies et j'accepte les conditions générales du Village Olympique.
                </label>
              </div>

              <div className="flex gap-4 mt-12 w-full">
                <Button className="flex-1 h-16 rounded-2xl font-black uppercase tracking-widest text-lg bg-slate-100 hover:bg-slate-200 text-slate-600" onClick={handlePrev} disabled={loading}>Retour</Button>
                <Button className="flex-[2] h-16 rounded-2xl font-black uppercase tracking-widest text-base md:text-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/10" onClick={handleSubmit} disabled={loading}>{loading ? 'Enregistrement...' : 'Confirmer l\'inscription'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-12 flex flex-col items-center gap-3">
        <div className="w-1 h-8 bg-emerald-400/20 rounded-full" />
        <span className="text-white/40 text-[10px] font-black tracking-[0.5em] uppercase">Napoli PMS</span>
      </div>

    </div>
  );
}

