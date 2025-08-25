// Resources page functionality

// Document data
const documents = {
    'bylaws': {
        title: 'HOA Bylaws',
        description: 'Official community bylaws and regulations',
        filename: 'soralia_bylaws_2024.pdf',
        size: '2.3 MB',
        lastUpdated: '2024-01-15'
    },
    'maintenance-forms': {
        title: 'Maintenance Request Forms',
        description: 'Forms for submitting maintenance and repair requests',
        filename: 'maintenance_forms_package.pdf',
        size: '1.8 MB',
        lastUpdated: '2024-02-01'
    },
    'financial-reports': {
        title: 'Financial Reports',
        description: 'Monthly and annual financial statements',
        filename: 'financial_report_2024_q1.pdf',
        size: '3.1 MB',
        lastUpdated: '2024-03-31'
    },
    'vendor-contracts': {
        title: 'Vendor Contracts',
        description: 'Service provider contracts and agreements',
        filename: 'vendor_contracts_2024.pdf',
        size: '4.2 MB',
        lastUpdated: '2024-01-01'
    },
    'meeting-minutes': {
        title: 'Board Meeting Minutes',
        description: 'Minutes from board meetings and decisions',
        filename: 'meeting_minutes_march_2024.pdf',
        size: '1.5 MB',
        lastUpdated: '2024-03-15'
    },
    'insurance-policies': {
        title: 'Insurance Policies',
        description: 'Community insurance coverage details',
        filename: 'insurance_policies_2024.pdf',
        size: '2.7 MB',
        lastUpdated: '2024-01-01'
    },
    'architecture-review': {
        title: 'Architecture Review Guidelines',
        description: 'Guidelines and approval process for home modifications',
        filename: 'architecture_review_guidelines_2024.pdf',
        size: '1.9 MB',
        lastUpdated: '2024-02-15'
    }
};

// Initialize resources page
document.addEventListener('DOMContentLoaded', function() {
    setupSmoothScrolling();
    setupAnimations();
});

// Setup smooth scrolling for anchor links
function setupSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

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
    
    // Observe all sections
    document.querySelectorAll('.bg-white.rounded-lg.shadow-lg').forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(20px)';
        section.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(section);
    });
}

// Download document function
function downloadDocument(docType) {
    const doc = documents[docType];
    if (!doc) {
        alert('Document not found.');
        return;
    }
    
    // Simulate download
    alert(`Downloading: ${doc.title}\n\nFilename: ${doc.filename}\nSize: ${doc.size}\nLast Updated: ${doc.lastUpdated}\n\nIn a real application, this would start the download.`);
    
    // In a real application, this would trigger an actual download
    console.log(`Downloading document: ${docType}`, doc);
}

// View document function
function viewDocument(docType) {
    const doc = documents[docType];
    if (!doc) {
        alert('Document not found.');
        return;
    }
    
    // Create modal for document preview
    showDocumentModal(doc);
}

// Show document modal
function showDocumentModal(doc) {
    // Create modal HTML
    const modalHTML = `
        <div id="documentModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-2xl font-bold text-gray-900">${doc.title}</h3>
                    <button onclick="closeDocumentModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <div class="mb-6">
                    <p class="text-gray-600 mb-4">${doc.description}</p>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div class="flex items-center">
                            <i class="fas fa-file-pdf text-red-600 mr-2"></i>
                            <span>${doc.filename}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-hdd text-blue-600 mr-2"></i>
                            <span>${doc.size}</span>
                        </div>
                        <div class="flex items-center">
                            <i class="fas fa-calendar text-green-600 mr-2"></i>
                            <span>Updated: ${doc.lastUpdated}</span>
                        </div>
                    </div>
                </div>
                
                <div class="bg-gray-100 rounded-lg p-8 text-center mb-6">
                    <i class="fas fa-file-pdf text-6xl text-red-600 mb-4"></i>
                    <p class="text-gray-600 mb-4">Document preview would appear here</p>
                    <p class="text-sm text-gray-500">In a real application, this would show the PDF content or a preview image</p>
                </div>
                
                <div class="flex space-x-4">
                    <button onclick="closeDocumentModal()" class="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors">
                        Close
                    </button>
                    <button onclick="downloadDocument('${Object.keys(documents).find(key => documents[key] === doc)}')" class="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fas fa-download mr-2"></i>Download
                    </button>
                </div>
            </div>
        </div>
    `;
    
    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Close modal when clicking outside
    document.getElementById('documentModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeDocumentModal();
        }
    });
}

// Close document modal
function closeDocumentModal() {
    const modal = document.getElementById('documentModal');
    if (modal) {
        modal.remove();
    }
}

// Add to calendar function
function addToCalendar() {
    const events = [
        {
            title: 'Monthly Community Meeting',
            date: getNextSaturday(),
            time: '14:00',
            duration: 2,
            location: 'Community Center'
        },
        {
            title: 'Garden Workshop',
            date: getNextSunday(),
            time: '10:00',
            duration: 2,
            location: 'Community Garden'
        }
    ];
    
    // Create calendar event data
    const calendarData = events.map(event => {
        const startDate = new Date(`${event.date}T${event.time}:00`);
        const endDate = new Date(startDate.getTime() + (event.duration * 60 * 60 * 1000));
        
        return {
            title: event.title,
            start: startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
            end: endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z',
            location: event.location
        };
    });
    
    // Show calendar options
    showCalendarModal(calendarData);
}

// Show calendar modal
function showCalendarModal(events) {
    const modalHTML = `
        <div id="calendarModal" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
                <div class="flex justify-between items-center mb-4">
                    <h3 class="text-xl font-bold text-gray-900">Add Events to Calendar</h3>
                    <button onclick="closeCalendarModal()" class="text-gray-400 hover:text-gray-600">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="space-y-4 mb-6">
                    ${events.map(event => `
                        <div class="border border-gray-200 rounded-lg p-4">
                            <h4 class="font-semibold text-gray-900">${event.title}</h4>
                            <p class="text-sm text-gray-600">${formatCalendarDate(event.start)}</p>
                            <p class="text-sm text-gray-500">${event.location}</p>
                        </div>
                    `).join('')}
                </div>
                
                <div class="space-y-3">
                    <button onclick="exportToGoogleCalendar()" class="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors">
                        <i class="fab fa-google mr-2"></i>Google Calendar
                    </button>
                    <button onclick="exportToOutlook()" class="w-full bg-blue-800 text-white py-2 px-4 rounded-lg hover:bg-blue-900 transition-colors">
                        <i class="fab fa-microsoft mr-2"></i>Outlook
                    </button>
                    <button onclick="downloadICS()" class="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors">
                        <i class="fas fa-download mr-2"></i>Download .ics file
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Close calendar modal
function closeCalendarModal() {
    const modal = document.getElementById('calendarModal');
    if (modal) {
        modal.remove();
    }
}

// Calendar export functions
function exportToGoogleCalendar() {
    alert('In a real application, this would create Google Calendar events.');
    closeCalendarModal();
}

function exportToOutlook() {
    alert('In a real application, this would create Outlook calendar events.');
    closeCalendarModal();
}

function downloadICS() {
    alert('In a real application, this would download an .ics calendar file.');
    closeCalendarModal();
}

// Utility functions
function getNextSaturday() {
    const today = new Date();
    const daysUntilSaturday = (6 - today.getDay()) % 7;
    const nextSaturday = new Date(today);
    nextSaturday.setDate(today.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
    return nextSaturday.toISOString().split('T')[0];
}

function getNextSunday() {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
    return nextSunday.toISOString().split('T')[0];
}

function formatCalendarDate(isoString) {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeDocumentModal();
        closeCalendarModal();
    }
});

// Add event listener for calendar button
document.addEventListener('DOMContentLoaded', function() {
    const calendarButton = document.querySelector('button[onclick*="calendar"]');
    if (calendarButton) {
        calendarButton.onclick = addToCalendar;
    }
});