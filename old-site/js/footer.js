// Reusable Footer Component JavaScript

// Load footer into page
async function loadFooter() {
  try {
    const response = await fetch('footer.html');
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const footerHTML = await response.text();

    // Insert footer at the end of body or in a specific container
    const footerContainer = document.getElementById('footer-container') || document.body;
    footerContainer.insertAdjacentHTML('beforeend', footerHTML);

    // Update current year
    updateCurrentYear();

    // Setup footer interactions
    setupFooterInteractions();

    console.log('Footer loaded successfully');
  } catch (error) {
    console.error('Error loading footer:', error);
    console.log('Using fallback footer');
    // Fallback: create basic footer
    createFallbackFooter();
  }
}

// Update current year in footer
function updateCurrentYear() {
  const yearElement = document.getElementById('currentYear');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }
}

// Setup footer interactions
function setupFooterInteractions() {
  // Add smooth scrolling for anchor links in footer
  const footerLinks = document.querySelectorAll('footer a[href^="#"]');
  footerLinks.forEach(link => {
    link.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    });
  });

  // Add click tracking for social media links (for analytics)
  const socialLinks = document.querySelectorAll('footer .fab');
  socialLinks.forEach(link => {
    link.closest('a').addEventListener('click', function (e) {
      const platform = this.querySelector('i').classList[1].replace('fa-', '');
      console.log(`Social media click: ${platform}`);
      // In a real app, this would send analytics data
    });
  });

  // Add hover effects to emergency contact cards
  const emergencyCards = document.querySelectorAll(
    'footer .bg-red-600, footer .bg-blue-600, footer .bg-green-600'
  );
  emergencyCards.forEach(card => {
    card.addEventListener('mouseenter', function () {
      this.style.transform = 'translateY(-2px)';
      this.style.transition = 'transform 0.2s ease';
    });

    card.addEventListener('mouseleave', function () {
      this.style.transform = 'translateY(0)';
    });
  });
}

// Fallback footer creation - now includes full footer content
function createFallbackFooter() {
  const fallbackFooterHTML = `
        <footer class="bg-gray-900 text-white mt-auto">
            <div class="container mx-auto px-4 py-12">
                <!-- Main Footer Content -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
                    <!-- Community Info -->
                    <div>
                        <div class="flex items-center space-x-3 mb-4">
                            <img src="logo.png" alt="Soralia Village Logo" class="w-12 h-12 rounded-full bg-white p-1 shadow-md object-cover">
                            <div>
                                <h3 class="text-xl font-bold">Soralia Village</h3>
                                <p class="text-sm text-gray-300">Community Living</p>
                            </div>
                        </div>
                        <p class="text-gray-300 text-sm mb-4">
                            A premier residential community in Cape Town, offering modern living with exceptional amenities and services.
                        </p>
                        <div class="flex space-x-4">
                            <a href="#" class="text-gray-300 hover:text-yellow-400 transition-colors">
                                <i class="fab fa-facebook text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-300 hover:text-yellow-400 transition-colors">
                                <i class="fab fa-twitter text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-300 hover:text-yellow-400 transition-colors">
                                <i class="fab fa-instagram text-xl"></i>
                            </a>
                            <a href="#" class="text-gray-300 hover:text-yellow-400 transition-colors">
                                <i class="fab fa-linkedin text-xl"></i>
                            </a>
                        </div>
                    </div>

                    <!-- Quick Links -->
                    <div>
                        <h4 class="text-lg font-semibold mb-4">Quick Links</h4>
                        <ul class="space-y-2">
                            <li><a href="index.html" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Home</a></li>
                            <li><a href="directory.html" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Directory</a></li>
                            <li><a href="services.html" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Services</a></li>
                            <li><a href="resources.html" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Resources</a></li>
                            <li><a href="conservation.html" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Conservation</a></li>
                        </ul>
                    </div>

                    <!-- Services -->
                    <div>
                        <h4 class="text-lg font-semibold mb-4">Services</h4>
                        <ul class="space-y-2">
                            <li><a href="services.html#maintenance" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Maintenance</a></li>
                            <li><a href="services.html#security" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Security</a></li>
                            <li><a href="services.html#landscaping" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Landscaping</a></li>
                            <li><a href="services.html#amenities" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Amenities</a></li>
                            <li><a href="resources.html#events" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Events</a></li>
                        </ul>
                    </div>

                    <!-- Contact Info -->
                    <div>
                        <h4 class="text-lg font-semibold mb-4">Contact Us</h4>
                        <div class="space-y-3">
                            <div class="flex items-start space-x-3">
                                <i class="fas fa-map-marker-alt text-yellow-400 mt-1"></i>
                                <div>
                                    <p class="text-gray-300 text-sm">Soralia Village</p>
                                    <p class="text-gray-300 text-sm">Cape Town, South Africa</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-3">
                                <i class="fas fa-phone text-yellow-400"></i>
                                <a href="tel:+27215550000" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">
                                    +27 21 555-0000
                                </a>
                            </div>
                            <div class="flex items-center space-x-3">
                                <i class="fas fa-envelope text-yellow-400"></i>
                                <a href="mailto:info@soralia.co.za" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">
                                    info@soralia.co.za
                                </a>
                            </div>
                            <div class="flex items-center space-x-3">
                                <i class="fas fa-clock text-yellow-400"></i>
                                <div>
                                    <p class="text-gray-300 text-sm">Office Hours:</p>
                                    <p class="text-gray-300 text-sm">Mon-Fri: 8AM-5PM</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Bottom Footer -->
                <div class="border-t border-gray-600 pt-8">
                    <div class="flex flex-col md:flex-row justify-between items-center">
                        <div class="text-center md:text-left mb-4 md:mb-0">
                            <p class="text-gray-300 text-sm">
                                &copy; <span id="currentYear">${new Date().getFullYear()}</span> Soralia Village Home Owners Association. All rights reserved.
                            </p>
                        </div>
                        <div class="flex flex-wrap justify-center md:justify-end space-x-6">
                            <a href="#" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Privacy Policy</a>
                            <a href="#" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Terms of Service</a>
                            <a href="#" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Community Guidelines</a>
                            <a href="resources.html#contacts" class="text-gray-300 hover:text-yellow-400 transition-colors text-sm">Contact</a>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    `;

  document.body.insertAdjacentHTML('beforeend', fallbackFooterHTML);
}

// Utility function to check if page needs footer
function shouldLoadFooter() {
  // Don't load footer if it already exists
  return !document.querySelector('footer');
}

// Initialize footer when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
  if (shouldLoadFooter()) {
    loadFooter();
  }
});

// Export functions for use in other scripts
window.FooterUtils = {
  loadFooter,
  updateCurrentYear,
  setupFooterInteractions,
};
