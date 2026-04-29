async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nom: 'TEST', prenom: 'TEST',
        nin: '123456789012345678',
        nationalite: 'DZ',
        sexe: 'M',
        groupe_sanguin: 'A+',
        formule: 'PC',
        est_etranger: 0
      })
    });
    console.log("CLIENT RESPONSE:", res.status, await res.text());

    const res2 = await fetch('http://localhost:3000/api/clients?statut=en_attente', {
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc3NDY5MTM5fQ.My0InrySaJ25Ye9XquCX_g78UWSOHOaZr_mI8kWi0m8' } 
    });
    console.log("CLIENTS EN ATTENTE:", res2.status, await res2.text());
  } catch(e) {
    console.error(e);
  }
}
test();
