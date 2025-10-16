
// Mobile Menu Toggle
const menuToggle = document.getElementById('menuToggle');
const sidebar = document.getElementById('sidebar');

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('-translate-x-full');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth < 1024) {
        if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.add('-translate-x-full');
        }
    }
});

// Close sidebar when clicking on a nav link on mobile
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth < 1024) {
            sidebar.classList.add('-translate-x-full');
        }
    });
});

// Handle responsive sidebar on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth >= 1024) {
        sidebar.classList.remove('-translate-x-full');
    } else {
        sidebar.classList.add('-translate-x-full');
    }
});

// Set active nav link on click
navLinks.forEach(link => {
    link.addEventListener('click', function () {
        navLinks.forEach(l => l.classList.remove('active', 'bg-gray-100'));
        this.classList.add('active', 'bg-gray-100');
    });
});

// Active link styling
const style = document.createElement('style');
style.textContent = `
    .nav-link.active {
        background - color: #f3f4f6 !important;
    color: #1f2937;
            }

    /* Responsive scrollbar for chart */
    @media (max-width: 640px) {
                .overflow - x - auto {
        -webkit - overflow - scrolling: touch;
                }
            }
    `;
document.head.appendChild(style);
