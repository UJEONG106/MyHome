// 0. Global State & Mouse Tracking
const mouse = { x: -1000, y: -1000, active: false };
window.addEventListener('mousemove', (e) => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    mouse.active = true;
    updateRobotEyes(e);
});

function updateRobotEyes(e) {
    const pupils = document.querySelectorAll('.pupil');
    pupils.forEach(pupil => {
        const rect = pupil.parentElement.getBoundingClientRect();
        const eyeCenterX = rect.left + rect.width / 2;
        const eyeCenterY = rect.top + rect.height / 2;
        
        const angle = Math.atan2(e.clientY - eyeCenterY, e.clientX - eyeCenterX);
        const distance = Math.min(rect.width / 4, Math.hypot(e.clientX - eyeCenterX, e.clientY - eyeCenterY) / 15);
        
        const x = Math.cos(angle) * distance;
        const y = Math.sin(angle) * distance;
        
        pupil.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
    });
}

// Random Blink
setInterval(() => {
    const eyes = document.querySelectorAll('.eye');
    eyes.forEach(eye => {
        eye.style.transform = 'scaleY(0.1)';
        setTimeout(() => eye.style.transform = 'scaleY(1)', 150);
    });
}, 4000 + Math.random() * 3000);

// 1. Loading Screen & Theme Initializer
window.addEventListener('load', () => {
    const loader = document.getElementById('loading-screen');
    setTimeout(() => {
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }, 1200);

    // Initial Theme
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
});

// 2. Scroll Progress & Animations
const scrollProgress = document.getElementById('scroll-progress');
window.addEventListener('scroll', () => {
    const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = (window.scrollY / totalHeight) * 100;
    scrollProgress.style.width = `${progress}%`;
});

const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            const id = entry.target.getAttribute('id');
            if(id) {
                document.querySelectorAll('.nav-links a').forEach(a => {
                    a.classList.remove('active');
                    if(a.getAttribute('href') === `#${id}`) a.classList.add('active');
                });
            }
        }
    });
}, observerOptions);

document.querySelectorAll('section, .animate-fade').forEach(el => observer.observe(el));

// 3. Circuit Background Canvas - Refined with Mouse Interaction & Collision Detection
const canvas = document.getElementById('circuit-bg');
const ctx = canvas.getContext('2d');
const gridSize = 40;
let width, height, lines = [];
const occupiedCells = new Set(); // Track occupied grid cells

function getGridKey(x, y) {
    return `${Math.round(x/gridSize)},${Math.round(y/gridSize)}`;
}

function initCanvas() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    lines = [];
    occupiedCells.clear();
    for (let i = 0; i < 25; i++) lines.push(new CircuitLine());
}

class CircuitLine {
    constructor() { this.reset(); }
    reset() {
        // Free up old points
        if (this.points) {
            this.points.forEach(p => occupiedCells.delete(getGridKey(p.x, p.y)));
        }

        // Find an unoccupied start point (max 10 attempts)
        let found = false;
        for(let i=0; i<10; i++) {
            this.gx = Math.floor((Math.random() * width) / gridSize) * gridSize;
            this.gy = Math.floor((Math.random() * height) / gridSize) * gridSize;
            if (!occupiedCells.has(getGridKey(this.gx, this.gy))) {
                found = true;
                break;
            }
        }
        
        this.x = this.gx; this.y = this.gy;
        occupiedCells.add(getGridKey(this.x, this.y));
        
        this.dir = Math.floor(Math.random() * 4);
        this.speed = 2; this.stepProgress = 0;
        this.points = [{ x: this.x, y: this.y }];
        this.maxPoints = 4 + Math.random() * 6;
        this.color = Math.random() > 0.7 ? '#F26122' : '#00D1FF';
        this.alive = true;
    }
    update() {
        if (!this.alive) { this.reset(); return; }
        this.stepProgress += this.speed;

        if (this.stepProgress >= gridSize) {
            this.stepProgress = 0;
            
            // Try directions: current, or turns
            const options = [this.dir, (this.dir + 1) % 4, (this.dir + 3) % 4];
            let nextDir = -1;
            
            // Shuffle options for more natural movement
            options.sort(() => Math.random() - 0.5);

            for (let d of options) {
                const nx = this.x + this.getDX(d);
                const ny = this.y + this.getDY(d);
                
                // Check boundaries and occupancy
                if (nx >= 0 && nx <= width && ny >= 0 && ny <= height && !occupiedCells.has(getGridKey(nx, ny))) {
                    nextDir = d;
                    break;
                }
            }

            if (nextDir === -1) {
                this.alive = false;
                return;
            }

            this.dir = nextDir;
            this.points.push({ x: this.x, y: this.y });
            occupiedCells.add(getGridKey(this.x + this.getDX(this.dir), this.y + this.getDY(this.dir)));

            if (this.points.length > this.maxPoints) {
                const tail = this.points.shift();
                occupiedCells.delete(getGridKey(tail.x, tail.y));
            }
        }
        this.x += (this.getDX(this.dir) / gridSize) * this.speed;
        this.y += (this.getDY(this.dir) / gridSize) * this.speed;
    }
    getDX(d) { return d === 0 ? gridSize : (d === 2 ? -gridSize : 0); }
    getDY(d) { return d === 1 ? gridSize : (d === 3 ? -gridSize : 0); }
    draw() {
        ctx.beginPath();
        const theme = document.documentElement.getAttribute('data-theme');
        ctx.strokeStyle = theme === 'light' ? '#ccc' : this.color;
        ctx.lineWidth = 1.5; ctx.lineJoin = 'round';
        ctx.moveTo(this.points[0].x, this.points[0].y);
        this.points.forEach(p => ctx.lineTo(p.x, p.y));
        ctx.lineTo(this.x, this.y); ctx.stroke();
        ctx.fillStyle = this.color; ctx.fillRect(this.x - 3, this.y - 3, 6, 6);
    }
}

function animate() {
    const theme = document.documentElement.getAttribute('data-theme');
    ctx.fillStyle = theme === 'light' ? 'rgba(255,255,255,0.4)' : 'rgba(10, 15, 29, 0.4)';
    ctx.fillRect(0, 0, width, height);
    lines.forEach(l => { l.update(); l.draw(); });
    requestAnimationFrame(animate);
}

window.addEventListener('resize', initCanvas);
initCanvas(); animate();

// 4. Dark Mode & Contact Handling
const themeToggle = document.getElementById('theme-toggle');
themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    const icon = themeToggle.querySelector('i');
    icon.className = theme === 'dark' ? 'fas fa-moon' : 'fas fa-sun';
}

// Smart Contact Backup (Copy to clipboard)
document.querySelectorAll('a[href^="mailto:"]').forEach(link => {
    link.addEventListener('click', (e) => {
        // We still let the default mailto: happen
        const email = 'shinwooj05@dongyang.ac.kr';
        navigator.clipboard.writeText(email).then(() => {
            showToast('이메일 주소가 복사되었습니다!');
        });
    });
});

function showToast(msg) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        document.body.appendChild(toast);
    }
    toast.innerText = msg;
    toast.className = 'show';
    setTimeout(() => { toast.className = toast.className.replace('show', ''); }, 3000);
}

// 5. Lightbox Logic
const modal = document.getElementById('image-modal');
const modalImg = document.getElementById('full-image');
const closeModal = document.querySelector('.close-modal');

document.querySelectorAll('.visual-card-mini img, .slider-item').forEach(img => {
    img.addEventListener('click', () => {
        modal.style.display = 'flex';
        modalImg.src = img.src;
    });
});

closeModal.addEventListener('click', () => {
    modal.style.display = 'none';
});

window.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
});

// 5.1 Blueprint Slider Logic
const track = document.getElementById('blueprint-track');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
let currentSlide = 0;

function updateSlider() {
    track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

nextBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentSlide = (currentSlide + 1) % 2;
    updateSlider();
});

prevBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    currentSlide = (currentSlide - 1 + 2) % 2;
    updateSlider();
});

// 7. Contact Logic (Board logic removed, now handled by board.js)
const contactForm = document.getElementById('contact-form');
if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('contact-name').value;
        const email = document.getElementById('contact-email').value;
        const msg = document.getElementById('contact-message').value;
        const mailtoUrl = `mailto:shinwooj05@dongyang.ac.kr?subject=[Portfolio Inquiry] from ${name}&body=Sender: ${email}%0D%0A%0D%0A${msg}`;
        window.location.href = mailtoUrl;
        showToast('문의가 전송되었습니다.');
        contactForm.reset();
    });
}



