// no require needed
async function test() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc3NDY5MTM5fQ.My0InrySaJ25Ye9XquCX_g78UWSOHOaZr_mI8kWi0m8';
  try {
    const res = await fetch('http://localhost:3000/api/reservations/checkin', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: 1,
        chambre_id: 1,
        date_checkout_prevu: '2026-05-10',
        formule: 'PC',
        mode_facturation: 'direct'
      })
    });
    console.log(res.status, await res.text());
  } catch(e) { console.error(e) }
}
test();
