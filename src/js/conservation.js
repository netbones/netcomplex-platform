// Conservation page functionality

// Initialize conservation page
document.addEventListener('DOMContentLoaded', function() {
    setupAnimations();
    loadConservationData();
});

// Setup scroll animations
function setupAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observe all sections for animation
    document.querySelectorAll('.bg-white, .bg-gradient-to-r').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
}

// Load conservation data and stats
function loadConservationData() {
    // Simulate loading real-time conservation data
    updateConservationStats();
    loadRecentSightings();
}

// Update conservation statistics
function updateConservationStats() {
    // In a real application, this would fetch from an API
    const stats = {
        plantsRestored: 2500,
        waterQuality: 85,
        birdSpecies: 45,
        volunteers: 120
    };
    
    // Animate counters
    animateCounter('plantsRestored', stats.plantsRestored);
    animateCounter('waterQuality', stats.waterQuality);
    animateCounter('birdSpecies', stats.birdSpecies);
    animateCounter('volunteers', stats.volunteers);
}

// Animate counter numbers
function animateCounter(elementId, targetValue) {
    const element = document.querySelector(`h3:contains("${targetValue}")`);
    if (!element) return;
    
    let currentValue = 0;
    const increment = targetValue / 50;
    const timer = setInterval(() => {
        currentValue += increment;
        if (currentValue >= targetValue) {
            currentValue = targetValue;
            clearInterval(timer);
        }
        element.textContent = Math.floor(currentValue).toLocaleString();
    }, 30);
}

// Load recent wildlife sightings
function loadRecentSightings() {
    const sightings = [
        {
            species: 'Cape Dwarf Chameleon',
            location: 'Wetland Edge',
            date: '2024-03-10',
            reporter: 'John Smith'
        },
        {
            species: 'Sunbird',
            location: 'Protea Grove',
            date: '2024-03-08',
            reporter: 'Maria Rodriguez'
        },
        {
            species: 'Cape River Frog',
            location: 'Main Pond',
            date: '2024-03-05',
            reporter: 'David Chen'
        }
    ];
    
    // Store sightings for potential display
    window.recentSightings = sightings;
}

// Join conservation efforts
function joinConservation() {
    const modal = createConservationModal();
    document.body.appendChild(modal);
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Create conservation signup modal
function createConservationModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-50';
    modal.id = 'conservationModal';
    
    modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div class="flex justify-between items-center mb-4">
                <h3 class="text-xl font-bold text-gray-900">Join Conservation Efforts</h3>
                <button onclick="closeConservationModal()" class="text-gray-400 hover:text-gray-600">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            
            <form id="conservationForm">
                <div class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                        <input type="text" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Email</label>
                        <input type="email" required class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                        <input type="tel" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Areas of Interest</label>
                        <div class="space-y-2">
                            <label class="flex items-center">
                                <input type="checkbox" class="mr-2" value="cleanup">
                                <span class="text-sm">Monthly Clean-up Days</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="mr-2" value="monitoring">
                                <span class="text-sm">Wildlife Monitoring</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="mr-2" value="education">
                                <span class="text-sm">Educational Tours</span>
                            </label>
                            <label class="flex items-center">
                                <input type="checkbox" class="mr-2" value="research">
                                <span class="text-sm">Research Projects</span>
                            </label>
                        </div>
                    </div>
                    
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
                        <select class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500">
                            <option value="">Select your experience</option>
                            <option value="beginner">Beginner - New to conservation</option>
                            <option value="intermediate">Intermediate - Some experience</option>
                            <option value="advanced">Advanced - Extensive experience</option>
                            <option value="professional">Professional - Work in the field</option>
                        </select>
                    </div>
                </div>
                
                <div class="flex space-x-3 mt-6">
                    <button type="button" onclick="closeConservationModal()" class="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                        Cancel
                    </button>
                    <button type="submit" class="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors">
                        <i class="fas fa-leaf mr-2"></i>Join Us
                    </button>
                </div>
            </form>
        </div>
    `;
    
    // Handle form submission
    modal.querySelector('#conservationForm').addEventListener('submit', handleConservationSignup);
    
    // Close modal when clicking outside
    modal.addEventListener('click', function(e) {
        if (e.target === this) {
            closeConservationModal();
        }
    });
    
    return modal;
}

// Handle conservation signup
function handleConservationSignup(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const interests = Array.from(e.target.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
    
    // Simulate form submission
    alert(`Thank you for joining our conservation efforts!\n\nWe'll contact you soon with information about upcoming activities.\n\nSelected interests: ${interests.join(', ')}`);
    
    closeConservationModal();
    e.target.reset();
}

// Close conservation modal
function closeConservationModal() {
    const modal = document.getElementById('conservationModal');
    if (modal) {
        modal.remove();
    }
}

// Report wildlife sighting
function reportSighting() {
    alert('Wildlife Sighting Report\n\nFeature coming soon! You\'ll be able to:\n\n• Upload photos of wildlife\n• Record GPS coordinates\n• Add species identification\n• Track sighting trends\n\nFor now, please contact our Conservation Manager at conservation@soralia.co.za');
}

// Download conservation guide
function downloadGuide() {
    alert('Downloading: Fynbos Conservation Guide\n\nThis comprehensive guide would include:\n\n• Plant identification charts\n• Wildlife spotting tips\n• Conservation best practices\n• Seasonal activity calendar\n• Emergency contact information');
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeConservationModal();
    }
});

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function getSeasonalInfo() {
    const month = new Date().getMonth();
    
    if (month >= 2 && month <= 4) { // March-May (Autumn)
        return {
            season: 'Autumn',
            activities: ['Seed collection', 'Alien plant removal', 'Bird migration monitoring'],
            blooming: ['Late proteas', 'Autumn ericas']
        };
    } else if (month >= 5 && month <= 7) { // June-August (Winter)
        return {
            season: 'Winter',
            activities: ['Wetland monitoring', 'Frog breeding surveys', 'Trail maintenance'],
            blooming: ['Winter flowering restios', 'Early proteas']
        };
    } else if (month >= 8 && month <= 10) { // September-November (Spring)
        return {
            season: 'Spring',
            activities: ['Peak flowering tours', 'Pollinator studies', 'Photography workshops'],
            blooming: ['Peak fynbos flowering', 'Protea spectacular']
        };
    } else { // December-February (Summer)
        return {
            season: 'Summer',
            activities: ['Fire management', 'Water conservation', 'Shade structure maintenance'],
            blooming: ['Summer restios', 'Drought-resistant species']
        };
    }
}

// Initialize seasonal information
document.addEventListener('DOMContentLoaded', function() {
    const seasonalInfo = getSeasonalInfo();
    console.log(`Current season: ${seasonalInfo.season}`, seasonalInfo);
});