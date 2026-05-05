export const getRedirectRouteForRole = (role) => {
  switch (role) {
    case 'admin': return '/admin';
    case 'housekeeping': return '/housekeeping';
    case 'maintenance': return '/maintenance';
    case 'securite': return '/securite';
    case 'pos': return '/pos';
    case 'accueil': return '/reception';
    default: return '/reception';
  }
};
