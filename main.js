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
    for (let i = 0; i < 15; i++) lines.push(new CircuitLine());
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
        this.speed = 0.8; this.stepProgress = 0;
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
        ctx.fillStyle = this.color; ctx.fillRect(this.x - 2, this.y - 2, 4, 4);
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
        if(modal && modalImg) {
            modal.style.display = 'flex';
            modalImg.src = img.src;
        }
    });
});

if (closeModal) {
    closeModal.addEventListener('click', () => {
        if(modal) modal.style.display = 'none';
    });
}

window.addEventListener('click', (e) => {
    if (modal && e.target === modal) modal.style.display = 'none';
});

// 5.1 Blueprint Slider Logic
const track = document.getElementById('blueprint-track');
const prevBtn = document.querySelector('.prev-btn');
const nextBtn = document.querySelector('.next-btn');
let currentSlide = 0;

function updateSlider() {
    if(track) track.style.transform = `translateX(-${currentSlide * 100}%)`;
}

if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentSlide = (currentSlide + 1) % 2;
        updateSlider();
    });
}

if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        currentSlide = (currentSlide - 1 + 2) % 2;
        updateSlider();
    });
}

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
}// 8. Language Toggle Translation
const translations = {
    "비전": "Vision",
    "핵심 역량": "Competency",
    "유지보수": "Maintenance",
    "지능형 아키텍트": "Intelligence",
    "로드맵": "Roadmap",
    "게시판": "Board",
    "연락하기": "Contact",
    "언어 전환": "Toggle Language",
    "테마 전환": "Toggle Theme",
    "스케일링 마스터 키": "Scaling Master Key",
    "공정의 한계를 돌파하는<br>엔지니어 <span class=\"highlight\">신우정</span>입니다.": "Engineer <span class=\"highlight\">Shin Ujeong</span><br>breaking through process limits.",
    "스케일링 마스터 | 에이전틱 아키텍트 | SK하이닉스 유지보수 엔지니어": "Scaling Master | Agentic Architect | SK Hynix Maintenance Engineer",
    "스토리 둘러보기": "Explore Story",
    "동양미래대학교 로봇소프트웨어과 전공 기반의 기술적 문제 해결력": "Technical problem-solving based on a major in Robotics Software at Dongyang Mirae University",
    "프로그래밍 (Python & C)": "Programming (Python & C)",
    "<strong>Python 데이터 분석</strong><br>Scikit-learn, TensorFlow 기반 AI 알고리즘 구현 및 로봇 제어 응용.": "<strong>Python Data Analysis</strong><br>Implementation of AI algorithms based on Scikit-learn, TensorFlow, and robot control applications.",
    "<strong>C/C++ 임베디드 최적화</strong><br>객체 지향 개념을 활용한 하드웨어 제어 및 효율적 메모리 관리 코딩.": "<strong>C/C++ Embedded Optimization</strong><br>Hardware control and efficient memory management coding utilizing object-oriented concepts.",
    "장치 제어 (Arduino)": "Device Control (Arduino)",
    "<strong>지능형 액추에이터 제어</strong><br>센서 데이터 기반 Servo, DC, 스테퍼 모터 복합 구동 시스템 설계.": "<strong>Intelligent Actuator Control</strong><br>Sensor data-based Servo, DC, stepper motor complex drive system design.",
    "<strong>상태 머신(State Machine)</strong><br>Non-blocking 기법을 활용한 오류 없는 고밀도 제어 로직 구현.": "<strong>State Machine</strong><br>Implementation of error-free high-density control logic utilizing non-blocking techniques.",
    "공정 자동화 (PLC)": "Automation (PLC)",
    "<strong>시퀀스 제어</strong><br>GX Works3 기반 공정 자동화 설비 운영 및 이상 유무 진단/유지보수.": "<strong>Sequence Control</strong><br>Operation of process automation facilities based on GX Works3 and diagnosis/maintenance of abnormalities.",
    "<strong>실무 자동화</strong><br>공기압 실린더 및 솔레노이드 밸브 연동 제어 등 산업 현장 설비 운영 역량.": "<strong>Practical Automation</strong><br>Ability to operate industrial field facilities such as pneumatic cylinder and solenoid valve interlocking control.",
    "반도체 기초 지식": "Semiconductor Basics",
    "<strong>회로 설계 및 분석</strong><br>TR, FET의 동작 원리를 활용한 스위칭 회로 설계 및 계측 검증.": "<strong>Circuit Design & Analysis</strong><br>Switching circuit design and measurement verification utilizing the operating principles of TR and FET.",
    "<strong>디지털 논리 설계</strong><br>순차 논리 회로 시뮬레이션 및 정밀 하드웨어 로직 구성 능력 보유.": "<strong>Digital Logic Design</strong><br>Sequential logic circuit simulation and precision hardware logic configuration capability.",
    "<i class=\"fas fa-lightbulb\"></i> <strong>AI 에이전트</strong>를 활용하여 복잡한 C/PLC 코드를 검증하고 최적화하는 '에이전틱 아키텍트'로서의 차별점을 보유하고 있습니다.": "<i class=\"fas fa-lightbulb\"></i> Possess the distinctive capability as an 'Agentic Architect' to verify and optimize complex C/PLC codes utilizing <strong>AI Agents</strong>.",
    "프로젝트: AJ-BOT": "PROJECT: AJ-BOT",
    "최적화된 링크 구조 기반의 보행형 로봇" : "Walking Robot Based on Optimized Link Structure",
    "단순 구동을 넘어, 정밀 설계를 통한 하드웨어 한계 극복 프로세스": "Beyond simple driving, a process to overcome hardware limitations through precision design",
    "구동 효율 향상": "Efficiency Increase",
    "부품 마모 감소": "Wear Reduction",
    "조립 정밀도": "Assembly Precision",
    "<i class=\"fas fa-search-plus\"></i> 원인 분석 논리": "<i class=\"fas fa-search-plus\"></i> The Diagnostic Logic",
    "[ISSUE 1] 모터 토크(Torque) 부족": "[ISSUE 1] Motor Torque Shortage",
    "설계 무게 대비 출력 부족으로 보행 속도 저하 인지<br>→ 기어비(Gear Ratio) 정밀 재조정을 통해 구동 효율 최적화": "Recognized walking speed degradation due to lack of output compared to design weight<br>→ Optimized drive efficiency through precise gear ratio readjustment",
    "[ISSUE 2] 접지력 및 마찰력 결함": "[ISSUE 2] Traction and Friction Defects",
    "아크릴 소재 발판의 지면 미끄러짐 분석<br>→ 소재 보강 및 마찰 계수 제어를 통해 보행 안정성 확보": "Analyzed ground slip of acrylic material step<br>→ Secured walking stability through material reinforcement and friction coefficient control",
    "[ISSUE 3] 링크 간 간섭 및 마모": "[ISSUE 3] Interference and Wear between Links",
    "소음 및 부품 마모 원인 추적<br>→ CAD 도면 재검토 및 각 조인트의 수평 정밀 정렬을 통한 마찰력 제로화": "Tracked causes of noise and part wear<br>→ CAD drawing review and horizontal precision alignment of each joint",
    "<i class=\"fas fa-check-circle\"></i> 체계적 검증": "<i class=\"fas fa-check-circle\"></i> Systematic Verification",
    "<span>AutoCAD 도면 기반 정합성 검증 완료</span>": "<span>AutoCAD Drawing-based Conformity Verification Completed</span>",
    "단순 제작에 그치지 않고, <strong>AutoCAD 설계 도면(Plan)</strong>과 실제 조립된 <strong>AJ-BOT(Physical)</strong> 사이의 기구학적 오차를 정밀 측정하여 링크 메커니즘의 동기화와 기어 구동 효율을 최적화했습니다.": "Not stopping at simple manufacturing, we optimized the synchronization of the link mechanism and gear drive efficiency by precisely measuring the kinematic error between the <strong>AutoCAD design drawing (Plan)</strong> and the actually assembled <strong>AJ-BOT (Physical)</strong>.",
    "<i class=\"fas fa-microchip\"></i> AutoCAD-실물 동기화 보고서": "<i class=\"fas fa-microchip\"></i> AutoCAD-PHYSICAL SYNC REPORT",
    "설비의 에러 원인을 논리적으로 분석하는 <strong>Troubleshooting</strong> 역량은 반도체 가동률 극대화의 핵심입니다.<br>AJ-BOT에서 증명한 '진단과 해결'의 논리를 SK하이닉스 실무에 그대로 투입하겠습니다.": "The <strong>Troubleshooting</strong> capability to logically analyze the causes of facility errors is the core of maximizing semiconductor operation rate.<br>I will put the logic of 'diagnosis and solution' proven in AJ-BOT into SK Hynix practice as it is.",
    "검증 논리": "Verification Logic",
    "Artifacts 기반 시스템 검증 역량. AI 산출물 검토와 기술적 환각 수정을 통해 시스템 무결성을 확보합니다.": "Artifacts-based System Verification Capability. Secures system integrity through AI output review and modification of technical hallucinations.",
    "Artifacts 분석": "Artifacts Analysis",
    "시스템 검증": "Verification",
    "머신러닝/딥러닝 응용": "ML/DL Application",
    "Python 기반 머신러닝 실무 응용. TensorFlow를 활용해 수율에 영향을 주는 변수를 학습 모델로 구현합니다.": "Python-based Machine Learning Practical Application. Implements variables affecting yield as a learning model using TensorFlow.",
    "자동화 규칙": "Automation Rules",
    "지능형 자동화 규칙 설계. Firebase 연동을 통해 임계값 초과 시 자동 알림 시스템을 구축하고 운영합니다.": "Intelligent Automation Rule Design. Builds and operates an automatic notification system via Firebase linkage when thresholds are exceeded.",
    "미래 로드맵": "Future Roadmap",
    "SK하이닉스와 함께 성장할 미래 유지보수 기술 로드맵": "Future Maintenance Technology Roadmap to Grow with SK Hynix",
    "1단계: 지능형 유지보수 전문가": "Phase 1: Intelligent Maintenance Specialist",
    "<strong>핵심 역할:</strong> Artifacts 기반 장비 진단. 센서 데이터 전수 조사 대신 AI 에이전트의 상태 보고서를 검토하여 이상 징후를 판별합니다.": "<strong>Core Role:</strong> Artifacts-based Equipment Diagnosis. Instead of full sensor data investigation, inspects the status report of the AI agent to determine abnormal signs.",
    "Arduino/PLC 지식을 활용해 현장 데이터 수집을 최적화하고 Gemini API와 연동하여 검증 효율을 50% 향상시킵니다.": "Optimizes field data collection using Arduino/PLC knowledge and improves verification efficiency by 50% by linking with Gemini API.",
    "Gemini PdM 통합": "Gemini PdM Integration",
    "2단계: 공정 지능 리드 아키텍트": "Phase 2: Process Intelligence Lead Architect",
    "<strong>핵심 역할:</strong> 스케일링 마스터 키 설계. TRIZ 기법과 반도체 소자 이해를 결합하여 미세 공정의 기술적 모순을 해결합니다.": "<strong>Core Role:</strong> Scaling Master Key Design. Resolves technical contradictions of fine processes by combining TRIZ methodology and understanding of semiconductor devices.",
    "Next.js/Firebase 기반 통합 대시보드를 구축하여 에이전트가 실시간 수율을 예측하고 최적 파라미터를 제안하는 시스템을 지휘합니다.": "Builds a Next.js/Firebase-based integrated dashboard so agents predict real-time yield and direct a system proposing optimal parameters.",
    "TRIZ 방법론": "TRIZ Methodology",
    "3단계: 자율 공정 비전가": "Phase 3: Autonomous Process Visionary",
    "<strong>핵심 역할:</strong> 에이전틱 거버넌스 수립. Antigravity급 시스템을 FAB에 이식하여 다중 에이전트 간의 자율성과 통제권을 설계합니다.": "<strong>Core Role:</strong> Establishment of Agentic Governance. Transplants Antigravity-class systems to the FAB to design autonomy and control among multiple agents.",
    "HBM 생산 라인에 완전 자율 유지보수 로봇 시스템을 구축하고, 글로벌 톱티어 엔지니어로서 반도체 산업의 지속 가능성을 책임집니다.": "Establishes a fully autonomous maintenance robot system on the HBM production line, taking responsibility for the sustainability of the semiconductor industry as a global top-tier engineer.",
    "에이전틱 거버넌스": "Agentic Governance",
    "자율 운영 FAB": "Autonomous FAB",
    "SK하이닉스의 미래를 함께 설계할 준비된 유지보수 엔지니어입니다.": "I am a prepared maintenance engineer ready to design the future of SK Hynix together.",
    "비선형적 성장: 미래를 설계하다": "Non-linear Growth: Designing the Future",
    "예정된 프로젝트 및 미래 로드맵": "Upcoming Projects & Future Roadmap",
    "SK하이닉스와 함께 성장할 미래 유지보수 기술 로드맵": "Future maintenance technology roadmap to grow with SK Hynix",
    "2026.09 - 2026.12": "Sep 2026 - Dec 2026",
    "이송로봇 제작": "Transfer Robot Manufacturing",
    "동양로봇경진대회 출전을 목표로, 반도체 생산 라인의 핵심인 웨이퍼 이송의 정밀도와 안정성을 극대화하는 로봇 아키텍처를 설계할 예정입니다.": "Targeting the Dong-yang Robot Competition, we plan to design a robot architecture that maximizes the precision and stability of wafer transfer, the core of semiconductor production lines.",
    "<strong><i class=\"fas fa-robot\"></i> 에이전틱 성과:</strong> AI 에이전트를 활용하여 하드웨어 병목 구간을 사전 시뮬레이션하고, 설계 최적화 시간을 획기적으로 단축하겠습니다.": "<strong><i class=\"fas fa-robot\"></i> Agentic Achievement:</strong> I will drastically shorten design optimization time by pre-simulating hardware bottlenecks using AI agents.",
    "2026.07 - 2026.08": "Jul 2026 - Aug 2026",
    "PLC 및 장비 S/W 몰입 교육": "PLC & Equipment S/W Immersive Education",
    "반도체 부트캠프의 몰입형 교육을 통해 실제 현장에서 쓰이는 PLC 실무 역량과 반도체장비 S/W 구현 능력을 체득하여, 즉시 투입 가능한 유지보수 엔지니어로 성장하겠습니다.": "Through immersive education at the semiconductor bootcamp, I will acquire practical PLC skills and semiconductor equipment S/W implementation skills used in actual fields, growing into an immediately deployable maintenance engineer.",
    "<strong><i class=\"fas fa-code\"></i> 에이전틱 성과:</strong> 복잡한 시퀀스 제어 로직을 에이전트로 정밀 검증하여 코드 오류 제로(Zero)를 달성하는 소프트웨어 최적화 역량을 확보하겠습니다.": "<strong><i class=\"fas fa-code\"></i> Agentic Achievement:</strong> I will secure software optimization capabilities to achieve zero code errors by precisely verifying complex sequence control logic with agents.",

    "2027.03 - 2027.12": "Mar 2027 - Dec 2027",
    "캡스톤 디자인 (Capstone Design)": "Capstone Design",
    "전공 지식과 AI 기술을 융합하여, 실제 산업 현장의 모순을 해결하는 지능형 시스템을 개발하는 최종 프로젝트입니다.": "A final project to develop an intelligent system that resolves contradictions in actual industrial fields by fusing major knowledge and AI technology.",
    "<strong><i class=\"fas fa-award\"></i> 에이전틱 성과:</strong> 마이크로디그리 과정과 연계하여, 다중 에이전트 간의 자율 거버넌스를 실제 로봇 시스템에 성공적으로 이식하는 클라이맥스 과제입니다.": "<strong><i class=\"fas fa-award\"></i> Agentic Achievement:</strong> A climax project to successfully transplant autonomous governance among multiple agents into actual robot systems in connection with the microdegree curriculum.",
    "전공 심화 과정": "Advanced Major Course",
    "마이크로디그리 (AI/전기제어)": "Microdegree (AI/Electrical Control)",
    "인공지능트랙 또는 전기제어트랙 마이크로디그리를 통해 특정 분야의 깊이 있는 전문 지식을 확보하고 기술적 완성도를 높이겠습니다.": "I will secure in-depth expertise in specific fields and improve technical completeness through the AI Track or Electrical Control Track microdegree.",
    "<strong><i class=\"fas fa-graduation-cap\"></i> 에이전틱 성과:</strong> 도메인 지식과 최첨단 기술의 시너지를 극대화하여, 특정 분야 전문가 수준의 지능형 유지보수 베이스를 구축하겠습니다.": "<strong><i class=\"fas fa-graduation-cap\"></i> Agentic Achievement:</strong> I will build an intelligent maintenance base at the level of a specific field expert by maximizing the synergy between domain knowledge and cutting-edge technology.",
    "신우정에게 연락하기": "Contact Shin Ujeong",
    "스토리로 돌아가기": "Back to Main Story",
    "<i class=\"fas fa-arrow-left\"></i> 스토리로 돌아가기": "<i class=\"fas fa-arrow-left\"></i> Back to Story",
    "자유 게시판": "Free Board",
    "궁금한 점이나 요청사항을 자유롭게 남겨주세요.": "Please feel free to leave any questions or requests.",
    "글쓰기": "Write",
    "성함": "Name",
    "이메일": "Email",
    "내용": "Content",
    "<i class=\"fas fa-microchip\"></i> 실시간 설비 진단 및 유지보수 시뮬레이션": "<i class=\"fas fa-microchip\"></i> Real-time Equipment Diagnosis & Maintenance Simulation",
    "저장하기": "Save",
    "취소": "Cancel",
    "협업 제안이나 기술적 문의는 아래 채널을 통해 남겨주세요.": "Please leave your collaboration proposals or technical inquiries through the channels below.",
    "메시지 전송하기 <i class=\"fas fa-paper-plane\"></i>": "Send Message <i class=\"fas fa-paper-plane\"></i>",
    "<i class=\"fas fa-pen\"></i> 글쓰기": "<i class=\"fas fa-pen\"></i> Write",
    "저장하기 <i class=\"fas fa-check\"></i>": "Save <i class=\"fas fa-check\"></i>",
    "취소 <i class=\"fas fa-times\"></i>": "Cancel <i class=\"fas fa-times\"></i>",
    "질문이나 요청사항을 입력해주세요...": "Please enter your questions or requests...",
    "함께 협업하고 싶은 내용이나 질문을 상세히 적어주세요...": "Please detail the content you want to collaborate on or questions...",
    "<i class=\"fas fa-edit\"></i> 수정": "<i class=\"fas fa-edit\"></i> Edit",
    "<i class=\"fas fa-trash\"></i> 삭제": "<i class=\"fas fa-trash\"></i> Delete",
    "등록": "Post",
    "댓글을 입력하세요...": "Write a comment...",
    "아직 게시물이 없습니다. 첫 질문을 남겨보세요!": "No posts yet. Be the first to leave a question!",
    "홍길동": "John Doe"
};

const reverseTranslations = {};
for (let ko in translations) reverseTranslations[translations[ko]] = ko;

let currentLang = localStorage.getItem('lang') || 'ko';
const langToggle = document.getElementById('lang-toggle');

function applyTranslation(lang) {
    const elements = document.querySelectorAll('h1, h2, h3, p, li, span, a, label, button, div, strong');
    
    elements.forEach(el => {
        // If this is the first time, store the original Korean HTML as the lookup key
        if (!el.dataset.i18nKey) {
            const cleanHTML = el.innerHTML.trim();
            // Only store if it's a key in our dictionary
            if (translations[cleanHTML]) {
                el.dataset.i18nKey = cleanHTML;
            } else {
                // If not an exact match, try normalized match (ignore extra spaces)
                const normalized = cleanHTML.replace(/\s+/g, ' ');
                const match = Object.keys(translations).find(k => k.replace(/\s+/g, ' ') === normalized);
                if (match) el.dataset.i18nKey = match;
            }
        }

        const key = el.dataset.i18nKey;
        if (key && translations[key]) {
            if (lang === 'en') {
                el.innerHTML = translations[key];
            } else {
                el.innerHTML = key; // Restore original Korean
            }
        }
    });

    const inputs = document.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        if (!input.dataset.i18nPh) {
            const ph = input.getAttribute('placeholder');
            if (ph && translations[ph]) {
                input.dataset.i18nPh = ph;
            }
        }
        
        const key = input.dataset.i18nPh;
        if (key && translations[key]) {
            input.setAttribute('placeholder', lang === 'en' ? translations[key] : key);
        }
    });

    // Translate dynamic alert text on board
    window.currentLang = lang;
}

window.applyTranslation = applyTranslation;

function initLangToggle() {
    // If not found, ignore
    if (!langToggle) return;
    
    // set initial text state
    langToggle.innerText = currentLang === 'ko' ? 'EN' : 'KO';
    
    // apply initial language if 'en'
    if (currentLang === 'en') {
        applyTranslation('en');
    }

    langToggle.addEventListener('click', () => {
        currentLang = currentLang === 'ko' ? 'en' : 'ko';
        langToggle.innerText = currentLang === 'ko' ? 'EN' : 'KO';
        localStorage.setItem('lang', currentLang);
        applyTranslation(currentLang);
    });
}

// 1-1. Count-up Animation for Performance Metrics
function initCountUp() {
    const metricSection = document.querySelector('.performance-metrics');
    if (!metricSection) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const values = entry.target.querySelectorAll('.metric-value');
                values.forEach(val => {
                    const target = val.innerText;
                    // Extract number and suffix (%, mm etc)
                    const numMatch = target.match(/(\d+(\.\d+)?)/);
                    if (numMatch) {
                        const endValue = parseFloat(numMatch[0]);
                        const suffix = target.replace(numMatch[0], '');
                        animateValue(val, 0, endValue, 2000, suffix);
                    }
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    observer.observe(metricSection);
}

function animateValue(obj, start, end, duration, suffix) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        
        // Easing function: easeOutExpo
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const current = easeProgress * (end - start) + start;
        
        // Handle decimal points for precision
        if (end % 1 !== 0) {
            obj.innerHTML = current.toFixed(1) + suffix;
        } else {
            obj.innerHTML = Math.floor(current) + suffix;
        }

        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// 9. Scroll Reveal Logic
function initScrollReveal() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('reveal');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
        observer.observe(el);
    });
}

// Ensure execution
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initLangToggle();
        initScrollReveal();
        initCountUp();
    });
} else {
    initLangToggle();
    initScrollReveal();
    initCountUp();
}
