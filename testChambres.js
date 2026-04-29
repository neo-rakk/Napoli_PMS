async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/chambres', {
      headers: { 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzc3NDY5MTM5fQ.My0InrySaJ25Ye9XquCX_g78UWSOHOaZr_mI8kWi0m8' } 
    });
    console.log("CHAMBRES:", res.status, await res.text());
  } catch(e) { console.error(e) }
}
test();
