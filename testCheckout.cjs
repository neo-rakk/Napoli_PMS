async function test() {
  const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc3NDY5MTM5fQ.My0InrySaJ25Ye9XquCX_g78UWSOHOaZr_mI8kWi0m8';
  
  try {
    const res = await fetch('http://localhost:3000/api/encaissements/pending', {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    const pending = await res.json();
    console.log("PENDING:", pending);

    if (pending.length > 0) {
      const soldeRes = await fetch('http://localhost:3000/api/reservations/' + pending[0].reservation_id + '/solde', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      console.log("SOLDE:", await soldeRes.json());
    }

  } catch(e) { console.error(e) }
}
test();
