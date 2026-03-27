// Directory data
const residents = [
    {
        id: 1,
        name: "John & Sarah Smith",
        address: "123 Pagoda Rd, Unit 4B",
        phone: "+27 21 555-0123",
        email: "smith.family@email.com",
        role: "board",
        interests: ["gardening", "book-club"],
        moveInDate: "2019-03-15",
        type: "owner",
        avatar: "https://via.placeholder.com/80x80/4F46E5/FFFFFF?text=JS"
    },
    {
        id: 2,
        name: "Maria Rodriguez",
        address: "45 Wild Almond Rd, Unit 2A",
        phone: "+27 21 555-0124",
        email: "maria.rodriguez@email.com",
        role: "committee",
        interests: ["fitness", "cooking"],
        moveInDate: "2020-07-22",
        type: "owner",
        avatar: "https://via.placeholder.com/80x80/7C3AED/FFFFFF?text=MR"
    },
    {
        id: 3,
        name: "David Chen",
        address: "78 Silkypuff Street, Unit 1C",
        phone: "+27 21 555-0125",
        email: "david.chen@email.com",
        role: "resident",
        interests: ["photography", "volunteering"],
        moveInDate: "2021-01-10",
        type: "tenant",
        avatar: "https://via.placeholder.com/80x80/F59E0B/FFFFFF?text=DC"
    },
    {
        id: 4,
        name: "Emma Thompson",
        address: "92 Beechwood Rd, Unit 3A",
        phone: "+27 21 555-0126",
        email: "emma.thompson@email.com",
        role: "board",
        interests: ["gardening", "book-club"],
        moveInDate: "2018-11-05",
        type: "owner",
        avatar: "https://via.placeholder.com/80x80/10B981/FFFFFF?text=ET"
    },
    {
        id: 5,
        name: "Michael Johnson",
        address: "156 Sugarbrush Rd, Unit 5B",
        phone: "+27 21 555-0127",
        email: "michael.johnson@email.com",
        role: "committee",
        interests: ["fitness", "photography"],
        moveInDate: "2020-09-18",
        type: "owner",
        avatar: "https://via.placeholder.com/80x80/EF4444/FFFFFF?text=MJ"
    },
    {
        id: 6,
        name: "Lisa Park",
        address: "234 Conebrush Rd, Unit 6A",
        phone: "+27 21 555-0128",
        email: "lisa.park@email.com",
        role: "resident",
        interests: ["cooking", "volunteering"],
        moveInDate: "2021-05-12",
        type: "tenant",
        avatar: "https://via.placeholder.com/80x80/8B5CF6/FFFFFF?text=LP"
    },
    {
        id: 7,
        name: "Robert Wilson",
        address: "67 Pagoda Rd, Unit 7C",
        phone: "+27 21 555-0129",
        email: "robert.wilson@email.com",
        role: "resident",
        interests: ["gardening", "fitness"],
        moveInDate: "2019-12-03",
        type: "owner",
        avatar: "https://via.placeholder.com/80x80/F97316/FFFFFF?text=RW"
    },
    {
        id: 8,
        name: "Amanda Davis",
        address: "189 Wild Almond Rd, Unit 8B",
        phone: "+27 21 555-0130",
        email: "amanda.davis@email.com",
        role: "committee",
        interests: ["book-club", "photography"],
        moveInDate: "2020-02-28",
        type: "owner",
        avatar: "https://via.placeholder.com/80x80/06B6D4/FFFFFF?text=AD"
    }
];

let currentView = 'grid';
let filteredResidents = [...residents];

// Initialize directory
document.addEventListener('DOMContentLoaded', function() {
    renderDirectory();
    setupEventListeners();

    const urlParams = new URLSearchParams(window.location.search);
    const street = urlParams.get('street');
    if (street) {
        const streetFilter = document.getElementById('streetFilter');
        const streetValue = street.toLowerCase().replace(/ /g, '-');
        streetFilter.value = streetValue;
        filterDirectory();
    }
});

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterDirectory);
    document.getElementById('roleFilter').addEventListener('change', filterDirectory);
    document.getElementById('streetFilter').addEventListener('change', filterDirectory);
    document.getElementById('interestFilter').addEventListener('change', filterDirectory);
    document.getElementById('sortFilter').addEventListener('change', filterDirectory);
}

// Filter directory based on current filters
function filterDirectory() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const roleFilter = document.getElementById('roleFilter').value;
    const streetFilter = document.getElementById('streetFilter').value;
    const interestFilter = document.getElementById('interestFilter').value;
    const sortFilter = document.getElementById('sortFilter').value;

    filteredResidents = residents.filter(resident => {
        const matchesSearch = resident.name.toLowerCase().includes(searchTerm) ||
                            resident.address.toLowerCase().includes(searchTerm) ||
                            resident.interests.some(interest => interest.toLowerCase().includes(searchTerm));
        
        const matchesRole = !roleFilter || resident.role === roleFilter;
        const matchesStreet = !streetFilter || resident.address.toLowerCase().includes(streetFilter.replace('-', ' '));
        const matchesInterest = !interestFilter || resident.interests.includes(interestFilter);

        return matchesSearch && matchesRole && matchesStreet && matchesInterest;
    });

    // Sort results
    sortResidents(sortFilter);
    renderDirectory();
}

// Sort residents
function sortResidents(sortBy) {
    switch(sortBy) {
        case 'name-asc':
            filteredResidents.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'name-desc':
            filteredResidents.sort((a, b) => b.name.localeCompare(a.name));
            break;
        case 'street':
            filteredResidents.sort((a, b) => a.address.localeCompare(b.address));
            break;
        case 'unit':
            filteredResidents.sort((a, b) => {
                const unitA = a.address.match(/Unit (\w+)/)?.[1] || '';
                const unitB = b.address.match(/Unit (\w+)/)?.[1] || '';
                return unitA.localeCompare(unitB);
            });
            break;
    }
}

// Render directory
function renderDirectory() {
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');
    
    if (currentView === 'grid') {
        gridView.innerHTML = filteredResidents.map((resident, index) => createResidentCard(resident, index)).join('');
        listView.innerHTML = '';
    } else {
        listView.innerHTML = filteredResidents.map(resident => createResidentListItem(resident)).join('');
        gridView.innerHTML = '';
    }

    // Update result count
    document.getElementById('resultCount').textContent = `Showing ${filteredResidents.length} residents`;
}

// Create resident card for grid view
function createResidentCard(resident, index) {
    const interestColors = {
        gardening: 'bg-green-500',
        fitness: 'bg-blue-500',
        'book-club': 'bg-purple-500',
        cooking: 'bg-red-500',
        photography: 'bg-indigo-500',
        volunteering: 'bg-yellow-500',
        'hoa-board': 'bg-gray-500',
        pets: 'bg-pink-500',
        'community-events': 'bg-teal-500',
        sustainability: 'bg-cyan-500',
        landscaping: 'bg-lime-500'
    };

    const roleColors = {
        board: 'bg-gray-500 text-white',
        committee: 'bg-gray-500 text-white',
        resident: 'bg-gray-100 text-gray-800'
    };

    // Alternate between primary blue and lighter blue
    const headerColor = index % 2 === 0 ? 'bg-soralia-primary' : 'bg-blue-500';

    return `
        <div class="directory-card bg-white rounded-lg shadow-md overflow-hidden transition duration-300">
            <div class="${headerColor} p-4 text-white">
                <a href="resident.html?id=${resident.id}" class="font-bold text-lg hover:underline">${resident.name}</a>
                <p class="text-sm">${resident.address}</p>
            </div>
            <div class="p-4">
                <div class="flex items-center mb-3">
                    <i class="fas fa-phone text-soralia-secondary mr-2"></i>
                    <span class="text-sm">${resident.phone}</span>
                </div>
                <div class="flex items-center mb-3">
                    <i class="fas fa-envelope text-soralia-secondary mr-2"></i>
                    <span class="text-sm">${resident.email}</span>
                </div>
                <div class="flex items-center mb-3">
                    <i class="fas fa-home text-soralia-secondary mr-2"></i>
                    <span class="text-sm">${resident.type.charAt(0).toUpperCase() + resident.type.slice(1)} since ${new Date(resident.moveInDate).getFullYear()}</span>
                </div>
                <div class="mt-4 mb-4">
                    ${resident.interests.map(interest =>
                        `<a href="interest.html?interest=${encodeURIComponent(interest)}" class="inline-block ${interestColors[interest] || 'bg-soralia-accent'} text-white text-xs px-2 py-1 rounded-full mr-1 mb-1">
                            ${interest.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </a>`
                    ).join('')}
                    ${resident.role !== 'resident' ?
                        `<span class="inline-block ${roleColors[resident.role]} text-xs px-2 py-1 rounded-full mr-1 mb-1">
                            ${resident.role === 'board' ? 'HOA Board' : 'Committee'}
                        </span>` : ''
                    }
                </div>
                <button onclick="openChatModal(${resident.id})" class="w-full bg-soralia-primary text-white py-2 px-4 rounded-lg hover:bg-soralia-secondary transition-colors">
                    <i class="fas fa-comments mr-2"></i>Chat
                </button>
            </div>
        </div>
    `;
}

// Create resident list item for list view
function createResidentListItem(resident) {
    const interestColors = {
        gardening: 'bg-green-100 text-green-800',
        fitness: 'bg-blue-100 text-blue-800',
        'book-club': 'bg-purple-100 text-purple-800',
        cooking: 'bg-red-100 text-red-800',
        photography: 'bg-indigo-100 text-indigo-800',
        volunteering: 'bg-yellow-100 text-yellow-800',
        'hoa-board': 'bg-gray-100 text-gray-800',
        pets: 'bg-pink-100 text-pink-800',
        'community-events': 'bg-teal-100 text-teal-800',
        sustainability: 'bg-cyan-100 text-cyan-800',
        landscaping: 'bg-lime-100 text-lime-800'
    };

    const roleColors = {
        board: 'bg-red-100 text-red-800',
        committee: 'bg-blue-100 text-blue-800',
        resident: 'bg-gray-100 text-gray-800'
    };

    return `
        <div class="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div class="flex items-center justify-between">
                <div class="flex items-center space-x-4">
                    <img src="${resident.avatar}" alt="${resident.name}" class="w-16 h-16 rounded-full">
                    <div>
                        <a href="resident.html?id=${resident.id}" class="text-xl font-bold text-gray-900 hover:underline">${resident.name}</a>
                        <p class="text-gray-600">${resident.address}</p>
                        <div class="flex items-center space-x-4 mt-2">
                            <span class="px-2 py-1 text-xs font-medium rounded-full ${roleColors[resident.role]}">
                                ${resident.role.charAt(0).toUpperCase() + resident.role.slice(1)}
                            </span>
                            <span class="text-sm text-gray-500">
                                ${resident.type.charAt(0).toUpperCase() + resident.type.slice(1)}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="text-right">
                    <div class="space-y-1 mb-3">
                        <p class="text-sm text-gray-600">
                            <i class="fas fa-phone text-soralia-primary mr-2"></i>
                            ${resident.phone}
                        </p>
                        <p class="text-sm text-gray-600">
                            <i class="fas fa-envelope text-soralia-primary mr-2"></i>
                            ${resident.email}
                        </p>
                    </div>
                    <button onclick="openChatModal(${resident.id})" class="bg-soralia-primary text-white py-2 px-4 rounded-lg hover:bg-soralia-secondary transition-colors">
                        <i class="fas fa-comments mr-2"></i>Chat
                    </button>
                </div>
            </div>
            <div class="mt-4 pt-4 border-t border-gray-200">
                <p class="text-sm font-medium text-gray-700 mb-2">Interests:</p>
                <div class="flex flex-wrap gap-2">
                    ${resident.interests.map(interest =>
                        `<a href="interest.html?interest=${encodeURIComponent(interest)}" class="px-3 py-1 text-sm ${interestColors[interest] || 'bg-soralia-light text-soralia-primary'} rounded-full">
                            ${interest.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </a>`
                    ).join('')}
                </div>
            </div>
        </div>
    `;
}

// Switch between grid and list views
function switchView(view) {
    currentView = view;
    
    const gridBtn = document.getElementById('gridViewBtn');
    const listBtn = document.getElementById('listViewBtn');
    const gridView = document.getElementById('gridView');
    const listView = document.getElementById('listView');

    if (view === 'grid') {
        gridBtn.classList.add('bg-soralia-primary', 'text-white');
        gridBtn.classList.remove('text-gray-600');
        listBtn.classList.remove('bg-soralia-primary', 'text-white');
        listBtn.classList.add('text-gray-600');
        
        gridView.classList.remove('hidden');
        listView.classList.add('hidden');
    } else {
        listBtn.classList.add('bg-soralia-primary', 'text-white');
        listBtn.classList.remove('text-gray-600');
        gridBtn.classList.remove('bg-soralia-primary', 'text-white');
        gridBtn.classList.add('text-gray-600');
        
        listView.classList.remove('hidden');
        gridView.classList.add('hidden');
    }

    renderDirectory();
}

// Search directory
function searchDirectory() {
    filterDirectory();
}

// Open chat modal
function openChatModal(residentId) {
    const resident = residents.find(r => r.id === residentId);
    if (!resident) return;

    const modal = document.getElementById('contactModal');
    const content = document.getElementById('contactModalContent');

    content.innerHTML = `
        <div class="text-center mb-6">
            <div class="relative mx-auto mb-4">
                <img src="${resident.avatar}" alt="${resident.name}" class="w-20 h-20 rounded-full mx-auto">
                <div class="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <h4 class="text-xl font-bold text-gray-900">${resident.name}</h4>
            <p class="text-gray-600">${resident.address}</p>
        </div>
        
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div class="flex items-start space-x-3">
                <i class="fas fa-info-circle text-blue-600 mt-1"></i>
                <div>
                    <h5 class="font-semibold text-blue-800 mb-2">Chat Interface Coming Soon!</h5>
                    <p class="text-sm text-blue-700">We're developing a real-time chat system for residents to communicate directly. For now, you can contact ${resident.name.split(' ')[0]} using the options below.</p>
                </div>
            </div>
        </div>
        
        <div class="space-y-4">
            <div class="flex items-center space-x-3">
                <i class="fas fa-phone text-soralia-primary"></i>
                <div>
                    <p class="font-medium">Phone</p>
                    <a href="tel:${resident.phone}" class="text-soralia-primary hover:underline">${resident.phone}</a>
                </div>
            </div>
            <div class="flex items-center space-x-3">
                <i class="fas fa-envelope text-soralia-primary"></i>
                <div>
                    <p class="font-medium">Email</p>
                    <a href="mailto:${resident.email}" class="text-soralia-primary hover:underline">${resident.email}</a>
                </div>
            </div>
        </div>
        
        <div class="mt-6 pt-6 border-t border-gray-200">
            <div class="flex space-x-3">
                <button onclick="closeChatModal()" class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                    Close
                </button>
                <a href="mailto:${resident.email}" class="flex-1 bg-soralia-primary text-white py-2 px-4 rounded-lg hover:bg-soralia-secondary transition-colors text-center">
                    Send Email
                </a>
            </div>
        </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close chat modal
function closeChatModal() {
    const modal = document.getElementById('contactModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Close modal when clicking outside
document.getElementById('contactModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeChatModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeChatModal();
    }
    if (e.key === '/' && !e.target.matches('input, textarea')) {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});