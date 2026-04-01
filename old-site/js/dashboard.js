// Dashboard functionality
let dashboardMap;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function () {
  initDashboardMap();
  loadDashboardData();
});

// Initialize the dashboard map
function initDashboardMap() {
  // Coordinates for the community
  const communityLocation = [-34.09165, 18.483269];

  // Create map
  dashboardMap = L.map('dashboardMap').setView(communityLocation, 16);

  // Add OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(dashboardMap);

  // Add community boundary
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
  ).addTo(dashboardMap);

  // Add user's home marker (example: Pagoda Rd)
  L.marker([-34.09165, 18.483269], {
    icon: L.divIcon({
      html: '<div class="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white"><i class="fas fa-home"></i></div>',
      className: 'user-home',
      iconSize: [30, 30],
    }),
  })
    .addTo(dashboardMap)
    .bindPopup('<b>Your Home</b><br>123 Pagoda Rd');

  // Add community center
  L.marker(communityLocation, {
    icon: L.divIcon({
      html: '<div class="bg-soralia-accent text-white text-sm font-bold px-2 py-1 rounded-full border-2 border-white"><i class="fas fa-building"></i></div>',
      className: 'community-center',
      iconSize: [30, 30],
    }),
  })
    .addTo(dashboardMap)
    .bindPopup('<b>Community Center</b><br>Events & Meetings');

  // Add maintenance markers (example issues)
  const maintenanceIssues = [
    {
      coords: [-34.09025, 18.483569],
      title: 'Garden Tap Repair',
      status: 'in-progress',
      description: 'Leaking tap in community garden',
    },
  ];

  maintenanceIssues.forEach(issue => {
    const color =
      issue.status === 'in-progress' ? 'yellow' : issue.status === 'completed' ? 'green' : 'red';

    L.marker(issue.coords, {
      icon: L.divIcon({
        html: `<div class="bg-${color}-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-white"><i class="fas fa-tools"></i></div>`,
        className: 'maintenance-marker',
        iconSize: [25, 25],
      }),
    })
      .addTo(dashboardMap)
      .bindPopup(
        `<b>${issue.title}</b><br>${issue.description}<br><em>Status: ${issue.status}</em>`
      );
  });
}

// Load dashboard data
function loadDashboardData() {
  // Simulate loading user-specific data
  console.log('Loading dashboard data...');

  // In a real application, this would fetch data from an API
  updateNotificationCount();
  updateWeather();
}

// Update notification count
function updateNotificationCount() {
  // This would typically come from an API
  const notificationCount = 3;
  // Update the notification badge if needed
}

// Update weather information
function updateWeather() {
  // In a real app, this would fetch from a weather API
  const weatherData = {
    temperature: 22,
    condition: 'Sunny',
    icon: 'fas fa-sun',
  };

  // Weather is already displayed in the HTML, but could be updated here
}

// Navigation functions
function logout() {
  if (confirm('Are you sure you want to logout?')) {
    // In a real app, this would clear session data
    window.location.href = 'index.html';
  }
}

function openDirectory() {
  // Navigate to directory section of main page
  window.location.href = 'index.html#directory';
}

function openBookingSystem() {
  alert(
    'Booking system would open here. Features:\n\n• Book community center\n• Reserve garden plots\n• Schedule facility maintenance\n• View availability calendar'
  );
}

function openPayments() {
  alert(
    'Payment portal would open here. Features:\n\n• View monthly statements\n• Pay community fees\n• Set up automatic payments\n• Download receipts'
  );
}

// Maintenance request modal functions
function openMaintenanceRequest() {
  document.getElementById('maintenanceModal').classList.remove('hidden');
  document.getElementById('maintenanceModal').classList.add('flex');
}

function closeMaintenanceModal() {
  document.getElementById('maintenanceModal').classList.add('hidden');
  document.getElementById('maintenanceModal').classList.remove('flex');
}

// Handle maintenance form submission
document.getElementById('maintenanceForm').addEventListener('submit', function (e) {
  e.preventDefault();

  // Get form data
  const formData = new FormData(this);
  const category = this.querySelector('select').value;
  const priority = this.querySelectorAll('select')[1].value;
  const description = this.querySelector('textarea').value;

  if (!description.trim()) {
    alert('Please provide a description of the issue.');
    return;
  }

  // Simulate submitting the request
  alert(
    `Maintenance request submitted successfully!\n\nCategory: ${category}\nPriority: ${priority}\nDescription: ${description}\n\nYou will receive updates via email and notifications.`
  );

  // Close modal and reset form
  closeMaintenanceModal();
  this.reset();

  // In a real app, this would send data to the server
  // and update the dashboard with the new request
});

// Simulate real-time updates
function simulateRealTimeUpdates() {
  // This would typically use WebSockets or Server-Sent Events
  setInterval(() => {
    // Randomly update some dashboard elements
    const now = new Date();
    console.log(`Dashboard update check: ${now.toLocaleTimeString()}`);

    // Could update notifications, weather, etc.
  }, 30000); // Check every 30 seconds
}

// Start real-time updates
simulateRealTimeUpdates();

// Utility functions
function formatDate(date) {
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

function formatTime(date) {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Add some interactive features
document.addEventListener('click', function (e) {
  // Handle notification clicks
  if (e.target.closest('.notification-item')) {
    // Mark notification as read
    e.target.closest('.notification-item').style.opacity = '0.7';
  }

  // Handle quick action clicks
  if (e.target.closest('.quick-action')) {
    // Add visual feedback
    const button = e.target.closest('.quick-action');
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
      button.style.transform = 'scale(1)';
    }, 150);
  }
});

// Keyboard shortcuts
document.addEventListener('keydown', function (e) {
  // Escape key closes modals
  if (e.key === 'Escape') {
    closeMaintenanceModal();
  }

  // Ctrl/Cmd + M opens maintenance request
  if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
    e.preventDefault();
    openMaintenanceRequest();
  }
});

// Responsive map resize
window.addEventListener('resize', function () {
  if (dashboardMap) {
    setTimeout(() => {
      dashboardMap.invalidateSize();
    }, 100);
  }
});
