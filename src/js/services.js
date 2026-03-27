// Service data
const serviceDetails = {
    maintenance: {
        title: "Maintenance Services",
        icon: "fas fa-tools",
        color: "blue",
        description: "Professional maintenance and repair services to keep your home and community in perfect condition.",
        features: [
            "24/7 Emergency Response",
            "Licensed & Insured Technicians",
            "Preventive Maintenance Programs",
            "Quality Guaranteed Work",
            "Online Request Tracking"
        ],
        services: [
            {
                name: "Plumbing Services",
                description: "Leak repairs, pipe installation, drain cleaning, and fixture replacement",
                price: "From R250/hour"
            },
            {
                name: "Electrical Services", 
                description: "Wiring, outlet installation, lighting, and electrical troubleshooting",
                price: "From R300/hour"
            },
            {
                name: "HVAC Services",
                description: "Air conditioning repair, heating system maintenance, and ventilation",
                price: "From R350/hour"
            },
            {
                name: "General Repairs",
                description: "Door/window repairs, drywall, painting, and general handyman services",
                price: "From R200/hour"
            }
        ],
        contact: "+27 21 555-FIXIT (34948)"
    },
    security: {
        title: "Security Services",
        icon: "fas fa-shield-alt",
        color: "orange",
        description: "Comprehensive security solutions to ensure the safety and peace of mind for all residents.",
        features: [
            "24/7 On-Site Security Personnel",
            "Advanced CCTV Monitoring",
            "Access Control Systems",
            "Emergency Response Team",
            "Regular Security Patrols"
        ],
        services: [
            {
                name: "Access Control",
                description: "Key cards, visitor management, and gate access control",
                price: "Included in HOA fees"
            },
            {
                name: "CCTV Monitoring",
                description: "24/7 surveillance of common areas and entry points",
                price: "Included in HOA fees"
            },
            {
                name: "Security Patrols",
                description: "Regular foot and vehicle patrols throughout the community",
                price: "Included in HOA fees"
            },
            {
                name: "Emergency Response",
                description: "Immediate response to security incidents and emergencies",
                price: "Included in HOA fees"
            }
        ],
        contact: "+27 21 555-SAFE (7233)"
    },
    landscaping: {
        title: "Landscaping Services",
        icon: "fas fa-leaf",
        color: "green",
        description: "Professional landscaping services to maintain beautiful outdoor spaces throughout our community.",
        features: [
            "Eco-Friendly Practices",
            "Seasonal Maintenance Programs",
            "Native Plant Specialists",
            "Water-Efficient Solutions",
            "Professional Equipment"
        ],
        services: [
            {
                name: "Garden Maintenance",
                description: "Pruning, weeding, fertilizing, and general garden care",
                price: "From R150/hour"
            },
            {
                name: "Lawn Care",
                description: "Mowing, edging, fertilizing, and lawn treatment services",
                price: "From R120/hour"
            },
            {
                name: "Tree Services",
                description: "Tree trimming, removal, and health assessments",
                price: "From R400/tree"
            },
            {
                name: "Irrigation Systems",
                description: "Installation, repair, and maintenance of watering systems",
                price: "Quote on request"
            }
        ],
        contact: "+27 21 555-GREEN (47336)"
    },
    parking: {
        title: "Parking Management",
        icon: "fas fa-car",
        color: "purple",
        description: "Efficient parking management system ensuring access for all residents.",
        features: [
            "Assigned Parking Spaces",
            "24/7 Parking Security",
            "Electric Vehicle Charging",
            "Remote Access Control"
        ],
        services: [
            {
                name: "Additional Remote Control",
                description: "Second ET-Blue Remote",
                price: "R250"
            },
            {
                name: "EV Charging",
                description: "Electric vehicle charging stations",
                price: "R15/kWh"
            },
            {
                name: "Additional Spaces",
                description: "Extra parking spaces when available",
                price: "R300/month"
            }
        ],
        contact: "+27 21 555-PARK (7275)"
    },
    internet: {
        title: "Internet & Cable Services",
        icon: "fas fa-wifi",
        color: "blue",
        description: "High-speed internet and streaming TV services for modern connectivity needs.",
        features: [
            "Fiber Optic Internet",
            "Multiple Speed Options",
            "Premium Cable Packages",
            "24/7 Technical Support",
            "Competitive Pricing"
        ],
        services: [
            {
                name: "Basic Internet",
                description: "10 Mbps directed wifi internet connection",
                price: "R250/month"
            },
            {
                name: "Premium Internet",
                description: "100 Mbps fiber internet connection",
                price: "R500/month"
            },
            {
                name: "Satellite TV Package",
                description: "200+ channels including premium content",
                price: "R799/month"
            },
            {
                name: "Bundle Package",
                description: "Internet + Cable TV combo package",
                price: "R1299/month"
            }
        ],
        contact: "+27 21 555-TECH (8324)"
    },
    waste: {
        title: "Waste Management",
        icon: "fas fa-recycle",
        color: "green",
        description: "Comprehensive waste management and recycling services to keep our community clean and sustainable.",
        features: [
            "Weekly Collection Service",
            "Recycling Programs",
            "Bulk Item Pickup",
            "Composting Services",
            "Environmental Compliance"
        ],
        services: [
            {
                name: "Regular Collection",
                description: "Weekly household waste collection service",
                price: "Included in HOA fees"
            },
            {
                name: "Recycling Service",
                description: "Bi-weekly recycling collection for paper, plastic, glass",
                price: "Included in HOA fees"
            },
            {
                name: "Bulk Item Pickup",
                description: "Monthly collection of large items and furniture",
                price: "R200/item"
            },
            {
                name: "Garden Waste",
                description: "Weekly collection of garden clippings and organic waste",
                price: "R150/month"
            }
        ],
        contact: "+27 21 555-CLEAN (25326)"
    },
    amenities: {
        title: "Soralia Amenities Deals",
        icon: "fas fa-swimming-pool",
        color: "cyan",
        description: "Access to our Share Codes with neighbouring amenities designed for recreation, fitness, and social activities.",
        features: [
            "Swimming Pool & Spa",
            "Fitness Center",
            "Community Center",
            "Children's Playground",
            "BBQ & Picnic Areas"
        ],
        services: [
            {
                name: "Pool Access",
                description: "Swimming pool and spa facilities",
                price: "Inquire for Pricing"
            },
            {
                name: "Fitness Center",
                description: "Fully equipped gym with modern equipment",
                price: "Inquire for Pricing"
            },
            {
                name: "Personal Training",
                description: "Professional fitness training sessions",
                price: "R240/session"
            }
        ],
        contact: "+27 21 555-CLUB (25822)"
    }
};

// Initialize services page
document.addEventListener('DOMContentLoaded', function() {
    setupServiceForm();
});

// Setup service request form
function setupServiceForm() {
    const form = document.getElementById('serviceRequestForm');
    form.addEventListener('submit', handleServiceRequest);
    
    // Set minimum date to today
    const dateInput = document.getElementById('preferredDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.min = today;
}

// Handle service request form submission
function handleServiceRequest(e) {
    e.preventDefault();
    
    const formData = {
        serviceType: document.getElementById('serviceType').value,
        priority: document.getElementById('priority').value,
        description: document.getElementById('description').value,
        preferredDate: document.getElementById('preferredDate').value,
        preferredTime: document.getElementById('preferredTime').value
    };
    
    // Validate required fields
    if (!formData.serviceType || !formData.description) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Simulate form submission
    const requestId = 'SR' + Date.now().toString().slice(-6);
    
    alert(`Service request submitted successfully!\n\nRequest ID: ${requestId}\nService: ${formData.serviceType}\nPriority: ${formData.priority}\n\nYou will receive a confirmation email shortly and be contacted within 24 hours.`);
    
    // Reset form
    e.target.reset();
    
    // In a real application, this would send data to the server
    console.log('Service request submitted:', formData);
}

// Open service modal
function openServiceModal(serviceType) {
    const service = serviceDetails[serviceType];
    if (!service) return;
    
    const modal = document.getElementById('serviceModal');
    const title = document.getElementById('serviceModalTitle');
    const content = document.getElementById('serviceModalContent');
    
    title.innerHTML = `<i class="${service.icon} mr-3"></i>${service.title}`;
    
    content.innerHTML = `
        <div class="mb-6">
            <p class="text-gray-600 text-lg">${service.description}</p>
        </div>
        
        <div class="mb-8">
            <h4 class="text-xl font-semibold text-gray-900 mb-4">Key Features</h4>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${service.features.map(feature => `
                    <div class="flex items-center">
                        <i class="fas fa-check-circle text-${service.color}-500 mr-3"></i>
                        <span class="text-gray-700">${feature}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="mb-8">
            <h4 class="text-xl font-semibold text-gray-900 mb-4">Available Services</h4>
            <div class="space-y-4">
                ${service.services.map(item => `
                    <div class="border border-gray-200 rounded-lg p-4">
                        <div class="flex justify-between items-start mb-2">
                            <h5 class="font-semibold text-gray-900">${item.name}</h5>
                            <span class="text-${service.color}-600 font-medium">${item.price}</span>
                        </div>
                        <p class="text-gray-600 text-sm">${item.description}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="bg-gray-50 rounded-lg p-6 mb-6">
            <div class="flex items-center mb-4">
                <i class="fas fa-phone text-${service.color}-600 text-xl mr-3"></i>
                <div>
                    <p class="font-semibold text-gray-900">Contact Information</p>
                    <p class="text-${service.color}-600">${service.contact}</p>
                </div>
            </div>
            <p class="text-sm text-gray-600">
                For immediate assistance or to schedule a service, please call our dedicated ${service.title.toLowerCase()} line.
            </p>
        </div>
        
        <div class="flex space-x-4">
            <button onclick="closeServiceModal()" class="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                Close
            </button>
            <button onclick="requestService('${serviceType}')" class="flex-1 bg-${service.color}-500 text-white py-3 px-4 rounded-lg hover:bg-${service.color}-600 transition-colors">
                <i class="fas fa-plus mr-2"></i>Request Service
            </button>
        </div>
    `;
    
    modal.classList.remove('hidden');
    modal.classList.add('flex');
}

// Close service modal
function closeServiceModal() {
    const modal = document.getElementById('serviceModal');
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

// Request specific service
function requestService(serviceType) {
    closeServiceModal();
    
    // Scroll to service request form
    const form = document.getElementById('serviceRequestForm');
    form.scrollIntoView({ behavior: 'smooth' });
    
    // Pre-select the service type
    document.getElementById('serviceType').value = serviceType;
    
    // Focus on description field
    setTimeout(() => {
        document.getElementById('description').focus();
    }, 500);
}

// Close modal when clicking outside
document.getElementById('serviceModal').addEventListener('click', function(e) {
    if (e.target === this) {
        closeServiceModal();
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeServiceModal();
    }
});

// Add some interactive animations
document.addEventListener('DOMContentLoaded', function() {
    // Animate service cards on scroll
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
    
    // Observe all service cards
    document.querySelectorAll('.bg-white.rounded-lg.shadow-lg').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });
});

// Utility functions
function formatPhoneNumber(phone) {
    // Format phone number for display
    return phone.replace(/(\+27)(\d{2})(\d{3})(\d{4})/, '$1 $2 $3-$4');
}

function validateServiceRequest(formData) {
    const errors = [];
    
    if (!formData.serviceType) {
        errors.push('Service type is required');
    }
    
    if (!formData.description || formData.description.trim().length < 10) {
        errors.push('Description must be at least 10 characters');
    }
    
    if (formData.preferredDate) {
        const selectedDate = new Date(formData.preferredDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate < today) {
            errors.push('Preferred date cannot be in the past');
        }
    }
    
    return errors;
}
