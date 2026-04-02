// Auth state
let isAuthenticated = false;
let isAdmin = false;

// DOM Elements
const authModal = document.getElementById('authModal');
const authButton = document.getElementById('authButton');
const adminSection = document.getElementById('adminSection');

// Initialize map
function initMap() {
  // Coordinates for the community (using the OpenStreetMap location you provided)
  const communityLocation = [-34.09165, 18.483269];

  // Create map
  const map = L.map('communityMap').setView(communityLocation, 16);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);

  // Add community boundary (simplified polygon)
  const communityBoundary = L.polygon(
    [
      [-34.09165, 18.483269],
      [-34.09145, 18.483569],
      [-34.09185, 18.483869],
      [-34.09205, 18.483569],
      [-34.09165, 18.483269],
    ],
    {
      color: '#4F46E5',
      fillColor: '#4F46E5',
      fillOpacity: 0.3,
      weight: 2,
    }
  ).addTo(map);

  // Add markers for streets
  const streets = [
    { name: 'Pagoda Rd', coords: [-34.09165, 18.483269] },
    { name: 'Wild Almond Rd', coords: [-34.09025, 18.483569] },
    { name: 'Silkypuff Street', coords: [-34.0907, 18.483869] },
    { name: 'Beechwood Rd', coords: [-34.09131, 18.483569] },
    { name: 'Sugarbrush Rd', coords: [-34.09164, 18.483369] },
    { name: 'Conebrush Rd', coords: [-34.09101, 18.483769] },
  ];

  streets.forEach(street => {
    L.marker(street.coords)
      .addTo(map)
      .bindTooltip(street.name, { permanent: true, direction: 'top', className: 'street-tooltip' })
      .on('click', () => {
        window.location.href = `directory.html?street=${encodeURIComponent(street.name)}`;
      });
  });

  // Add community center marker
  L.marker(communityLocation, {
    icon: L.divIcon({
      html: '<div class="bg-soralia-accent text-white text-sm font-bold px-2 py-1 rounded-full border-2 border-white"><i class="fas fa-home"></i></div>',
      className: 'community-center',
      iconSize: [30, 30],
    }),
  })
    .addTo(map)
    .bindTooltip('Soralia Community Center', {
      direction: 'top',
      className: 'community-center-tooltip',
    });
}

// Toggle auth modal
function toggleAuthModal() {
  authModal.classList.toggle('active');
}

// Switch between sign in and sign up tabs
function switchAuthTab(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  const forms = document.querySelectorAll('.auth-form');

  tabs.forEach(t => {
    if (t.textContent.toLowerCase().includes(tab)) {
      t.classList.add('border-b-2', 'border-soralia-primary', 'text-soralia-primary');
      t.classList.remove('text-gray-500');
    } else {
      t.classList.remove('border-b-2', 'border-soralia-primary', 'text-soralia-primary');
      t.classList.add('text-gray-500');
    }
  });

  forms.forEach(f => {
    if (f.id.includes(tab)) {
      f.classList.remove('hidden');
    } else {
      f.classList.add('hidden');
    }
  });

  document.getElementById('authModalTitle').textContent = tab === 'signin' ? 'Sign In' : 'Sign Up';
}

// Handle form submissions
document.getElementById('signinForm').addEventListener('submit', function (e) {
  e.preventDefault();
  // Simulate authentication
  simulateAuth(true, false);
});

document.getElementById('signupForm').addEventListener('submit', function (e) {
  e.preventDefault();
  // Simulate successful signup and automatic login
  simulateAuth(true, false);
});

// Simulate authentication
function simulateAuth(authenticated, admin) {
  isAuthenticated = authenticated;
  isAdmin = admin;

  if (isAuthenticated) {
    authButton.textContent = 'Dashboard';
    authButton.onclick = function () {
      // Navigate to resident dashboard
      window.location.href = 'dashboard.html';
    };

    if (isAdmin) {
      adminSection.classList.remove('hidden');
    }

    // Show success message and redirect to dashboard
    setTimeout(() => {
      window.location.href = 'dashboard.html';
    }, 1000);
  } else {
    authButton.textContent = 'Sign In';
    authButton.onclick = toggleAuthModal;
    adminSection.classList.add('hidden');
  }

  toggleAuthModal();
}

// Toggle between grid and list views
document.getElementById('gridView').addEventListener('click', function () {
  document.getElementById('directoryGrid').classList.remove('hidden');
  document.getElementById('directoryList').classList.add('hidden');
  this.classList.add('bg-soralia-primary', 'text-white');
  this.classList.remove('bg-gray-200', 'text-gray-700');
  document.getElementById('listView').classList.add('bg-gray-200', 'text-gray-700');
  document.getElementById('listView').classList.remove('bg-soralia-primary', 'text-white');
});

document.getElementById('listView').addEventListener('click', function () {
  document.getElementById('directoryGrid').classList.add('hidden');
  document.getElementById('directoryList').classList.remove('hidden');
  this.classList.add('bg-soralia-primary', 'text-white');
  this.classList.remove('bg-gray-200', 'text-gray-700');
  document.getElementById('gridView').classList.add('bg-gray-200', 'text-gray-700');
  document.getElementById('gridView').classList.remove('bg-soralia-primary', 'text-white');
});

// Initialize
document.addEventListener('DOMContentLoaded', function () {
  initMap();
  // Check for authenticated user (would be from session/cookie in real app)
  // simulateAuth(false, false);
});
