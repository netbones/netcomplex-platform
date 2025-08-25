// Reusable Header Component JavaScript

// Load header into page
async function loadHeader() {
    try {
        const response = await fetch('header.html');
        const headerHTML = await response.text();
        
        // Insert header at the beginning of body
        document.body.insertAdjacentHTML('afterbegin', headerHTML);
        
        // Set active page
        setActivePage();
        
        // Setup mobile menu if needed
        setupMobileMenu();
        
    } catch (error) {
        console.error('Error loading header:', error);
        // Fallback: create basic header
        createFallbackHeader();
    }
}

// Set active page styling
function setActivePage() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('nav a[data-page]');
    
    navLinks.forEach(link => {
        const linkPage = link.getAttribute('data-page');
        if (linkPage === currentPage) {
            link.classList.add('text-soralia-accent', 'font-semibold');
            link.classList.remove('hover:text-soralia-accent');
        } else {
            link.classList.remove('text-soralia-accent', 'font-semibold');
            link.classList.add('hover:text-soralia-accent');
        }
    });
}

// Get current page name
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    
    switch(filename) {
        case 'index.html':
        case '':
            return 'home';
        case 'directory.html':
            return 'directory';
        case 'services.html':
            return 'services';
        case 'resources.html':
            return 'resources';
        case 'conservation.html':
            return 'conservation';
        case 'dashboard.html':
            return 'dashboard';
        default:
            return 'home';
    }
}

// Setup mobile menu toggle
function setupMobileMenu() {
    const mobileMenuButton = document.querySelector('.md\\:hidden');
    const nav = document.querySelector('nav');
    
    if (mobileMenuButton && nav) {
        mobileMenuButton.addEventListener('click', function() {
            nav.classList.toggle('hidden');
            nav.classList.toggle('absolute');
            nav.classList.toggle('top-full');
            nav.classList.toggle('left-0');
            nav.classList.toggle('right-0');
            nav.classList.toggle('bg-soralia-primary');
            nav.classList.toggle('flex-col');
            nav.classList.toggle('py-4');
            nav.classList.toggle('space-x-0');
            nav.classList.toggle('space-y-2');
        });
    }
}

// Fallback header creation
function createFallbackHeader() {
    const headerHTML = `
        <header class="bg-soralia-primary text-white shadow-md">
            <div class="container mx-auto px-4 py-4 flex justify-between items-center">
                <div class="flex items-center space-x-3">
                    <img src="logo.png" alt="Soralia Village Logo" class="w-16 h-16 rounded-full bg-white p-2 border-2 border-white shadow-lg object-cover">
                    <div>
                        <h1 class="text-2xl font-bold">Soralia Village</h1>
                        <p class="text-xs opacity-75">Community Living</p>
                    </div>
                </div>
                <nav class="hidden md:flex space-x-6">
                    <a href="index.html" class="hover:text-soralia-accent font-medium">Home</a>
                    <a href="directory.html" class="hover:text-soralia-accent font-medium">Directory</a>
                    <a href="services.html" class="hover:text-soralia-accent font-medium">Services</a>
                    <a href="resources.html" class="hover:text-soralia-accent font-medium">Resources</a>
                    <a href="conservation.html" class="hover:text-soralia-accent font-medium">Conservation</a>
                </nav>
                <div class="flex items-center space-x-4">
                    <a href="dashboard.html" class="bg-white text-soralia-primary py-2 px-4 rounded-md hover:bg-gray-100 transition">
                        Sign In
                    </a>
                </div>
            </div>
        </header>
    `;
    
    document.body.insertAdjacentHTML('afterbegin', headerHTML);
}

// Initialize header when DOM is loaded
document.addEventListener('DOMContentLoaded', loadHeader);
