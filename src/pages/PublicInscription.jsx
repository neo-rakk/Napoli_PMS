import React, { useState } from 'react';
import { Button } from '../components/ui/Button';

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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow p-8 max-w-lg w-full text-center">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Inscription réussie</h2>
          <p className="text-slate-600 mb-6">Votre dossier a été enregistré avec succès.</p>
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200">
            <p className="text-sm text-slate-500 uppercase font-semibold">Numéro de dossier</p>
            <p className="text-2xl font-black text-emerald-800 tracking-wider font-mono mt-1">
              {dossierInfo.dossier}
            </p>
          </div>
          <p className="text-sm text-slate-500 mt-6">
            Présentez ce numéro à la réception lors de votre arrivée.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 px-8 py-6 text-white text-center">
          <h1 className="text-xl font-bold uppercase tracking-widest">Village Olympique Napoli</h1>
          <p className="text-slate-400 mt-1">Inscription Visiteur / Athlète</p>
        </div>

        <div className="p-8">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-800 mb-4">1. Identité</h2>
              
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2">
                  <input type="radio" name="etr" checked={formData.est_etranger === 0} onChange={() => setFormData({...formData, est_etranger: 0})} />
                  Algérien
                </label>
                <label className="flex items-center gap-2">
                  <input type="radio" name="etr" checked={formData.est_etranger === 1} onChange={() => setFormData({...formData, est_etranger: 1})} />
                  Étranger
                </label>
              </div>

              {formData.est_etranger === 0 ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIN (18 chiffres)</label>
                  <input type="text" className="w-full border rounded p-2" value={formData.nin} onChange={e => setFormData({...formData, nin: e.target.value})} maxLength={18} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type de pièce</label>
                    <select className="w-full border rounded p-2" value={formData.type_piece} onChange={e => setFormData({...formData, type_piece: e.target.value})}>
                      <option value="">Sélectionner</option>
                      <option value="passeport">Passeport</option>
                      <option value="carte_id">Carte d'Identité</option>
                      <option value="titre_sejour">Titre de séjour</option>
                      <option value="laissez_passer">Laissez-passer</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro</label>
                    <input type="text" className="w-full border rounded p-2" value={formData.num_piece} onChange={e => setFormData({...formData, num_piece: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                  <input type="text" className="w-full border rounded p-2 uppercase" value={formData.nom} onChange={e => setFormData({...formData, nom: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                  <input type="text" className="w-full border rounded p-2" value={formData.prenom} onChange={e => setFormData({...formData, prenom: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance</label>
                  <input type="date" className="w-full border rounded p-2" value={formData.date_naissance} onChange={e => setFormData({...formData, date_naissance: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance</label>
                  <input type="text" className="w-full border rounded p-2" value={formData.lieu_naissance} onChange={e => setFormData({...formData, lieu_naissance: e.target.value})} />
                </div>
              </div>

              {isMineur && formData.date_naissance && (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl mt-4 space-y-4">
                  <div className="flex items-center gap-2 text-amber-800 font-bold mb-2">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Client Mineur
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom du tuteur</label>
                    <input type="text" className="w-full border rounded p-2" value={formData.tuteur_nom} onChange={e => setFormData({...formData, tuteur_nom: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contact tuteur</label>
                    <input type="text" className="w-full border rounded p-2" value={formData.tuteur_contact} onChange={e => setFormData({...formData, tuteur_contact: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cité / Adresse</label>
                  <input type="text" className="w-full border rounded p-2" value={formData.adresse_residence} onChange={e => setFormData({...formData, adresse_residence: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Groupe Sanguin</label>
                  <select className="w-full border rounded p-2" value={formData.groupe_sanguin} onChange={e => setFormData({...formData, groupe_sanguin: e.target.value})}>
                    {['ND','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex justify-end mt-8">
                <Button onClick={handleNext} disabled={!formData.nom || !formData.prenom}>Suivant</Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4">2. Formule de séjour</h2>
              <div className="space-y-4">
                {[
                  { id: 'PD', title: 'Petit Déjeuner (PD)', desc: 'Nuitée + Petit Déjeuner inclus.' },
                  { id: 'DP', title: 'Demi-Pension (DP)', desc: 'Nuitée + Petit Déjeuner + Déjeuner ou Dîner.' },
                  { id: 'PC', title: 'Pension Complète (PC)', desc: 'Nuitée + Les 3 repas inclus.' }
                ].map(f => (
                  <label key={f.id} className={`block border-2 rounded-xl p-4 cursor-pointer transition-colors ${formData.formule === f.id ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-emerald-200'}`}>
                    <div className="flex items-center gap-4">
                      <input type="radio" className="w-5 h-5 text-emerald-600" name="formule" checked={formData.formule === f.id} onChange={() => setFormData({...formData, formule: f.id})} />
                      <div>
                        <div className="font-bold text-slate-800">{f.title}</div>
                        <div className="text-sm text-slate-500">{f.desc}</div>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handlePrev}>Retour</Button>
                <Button onClick={handleNext} disabled={!formData.formule}>Suivant</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4">3. Photos & Captures</h2>
              <p className="text-slate-500 mb-6 text-sm">Afin de compléter votre identification, nous avons besoin de 3 photos. Ces photos seront requises pour la validation à la réception.</p>
              
              <div className="space-y-4">
                {['photo_selfie', 'photo_piece_recto', 'photo_piece_verso'].map(id => (
                  <div key={id} className={`p-4 rounded-lg flex items-center justify-between transition-colors ${formData[id] ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-slate-200'}`}>
                    <div>
                      <h4 className="font-medium text-slate-800">
                        {id === 'photo_selfie' ? 'Selfie' : id === 'photo_piece_recto' ? 'Pièce d\'identité (Recto)' : 'Pièce d\'identité (Verso)'}
                      </h4>
                      <p className="text-xs text-slate-500">{formData[id] ? 'Capturé' : 'Non fourni'}</p>
                    </div>
                    {/* Placeholder action. Should implement real CameraCapture component later */}
                    <div className="bg-slate-200 text-slate-600 px-3 py-1 rounded text-sm font-medium cursor-pointer" 
                      onClick={() => setFormData({...formData, [id]: 'simulated-base64'})}>
                      {formData[id] ? 'Reprendre' : 'Prendre'}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handlePrev}>Retour</Button>
                <Button onClick={handleNext} disabled={!formData.photo_selfie || !formData.photo_piece_recto || !formData.photo_piece_verso}>Suivant</Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div>
              <h2 className="text-lg font-bold text-slate-800 mb-4">4. Confirmation</h2>
              <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 flex flex-col gap-3">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Nom Complet</span>
                  <span className="font-bold">{formData.nom} {formData.prenom}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Identité</span>
                  <span className="font-medium">{formData.est_etranger ? formData.num_piece : formData.nin}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-slate-500">Formule</span>
                  <span className="font-medium">{formData.formule}</span>
                </div>
                {isMineur && (
                   <div className="flex justify-between border-b pb-2">
                     <span className="text-slate-500">Tuteur</span>
                     <span className="font-medium text-amber-700">{formData.tuteur_nom}</span>
                   </div>
                )}
              </div>

              <div className="mt-6 flex gap-3">
                <input type="checkbox" id="cert" className="mt-1" />
                <label htmlFor="cert" className="text-sm text-slate-600">
                  Je certifie sur l'honneur l'exactitude des informations fournies et j'accepte les conditions générales du Village Olympique.
                </label>
              </div>

              <div className="flex justify-between mt-8">
                <Button variant="ghost" onClick={handlePrev} disabled={loading}>Retour</Button>
                <Button onClick={handleSubmit} disabled={loading}>{loading ? 'Envoi...' : 'Soumettre mon inscription'}</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
