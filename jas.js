/* --- STATE MANAGEMENT --- */
        let appData = {
            extractedText: "",
            fileName: "",
            questions: [],
            currentIndex: 0,
            score: 0,
            wrongAnswers: [],
            qty: 10,
            difficulty: 'mixed'
        };

        /* --- UI TRIGGERS & OVERLAY --- */
        const overlay = document.getElementById('app-overlay');
        const triggers = document.querySelectorAll('.open-app-trigger');
        const closeBtn = document.getElementById('close-app-btn');
        const pasteArea = document.getElementById('paste-area');
        const startBtn = document.getElementById('start-build-btn');
        
        // Ensure overlay has correct CSS
        overlay.style.zIndex = "1000";

        triggers.forEach(t => t.addEventListener('click', (e) => {
            e.preventDefault();
            overlay.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }));

        closeBtn.addEventListener('click', () => {
            overlay.style.display = 'none';
            document.body.style.overflow = 'auto';
        });

        function checkReadyState() {
            const hasText = pasteArea.value.trim().length > 20;
            const hasFile = appData.extractedText.length > 0;
            startBtn.disabled = !(hasText || hasFile);
            startBtn.style.opacity = startBtn.disabled ? 0.5 : 1;
        }

        pasteArea.addEventListener('input', () => {
            appData.extractedText = pasteArea.value;
            checkReadyState();
        });

        /* --- SETTINGS UI --- */
        document.getElementById('btn-plus').onclick = () => { if(appData.qty < 50) appData.qty += 5; document.getElementById('qty-display').innerText = appData.qty; };
        document.getElementById('btn-minus').onclick = () => { if(appData.qty > 5) appData.qty -= 5; document.getElementById('qty-display').innerText = appData.qty; };
        
        document.querySelectorAll('.diff-pill').forEach(pill => {
            pill.onclick = (e) => {
                document.querySelectorAll('.diff-pill').forEach(p => {
                    p.classList.remove('active');
                    p.style.background = 'var(--card-bg)';
                    p.style.borderColor = 'var(--border)';
                });
                e.target.classList.add('active');
                e.target.style.background = 'rgba(124,107,255,0.1)';
                e.target.style.borderColor = 'var(--accent)';
                appData.difficulty = e.target.getAttribute('data-val');
            }
        });

        /* --- FILE UPLOAD & PDF.JS --- */
        const dropZone = document.getElementById('drop-zone');
        const fileInput = document.getElementById('file-input');
        const filePreview = document.getElementById('file-preview');

        dropZone.addEventListener('click', () => fileInput.click());
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = "var(--accent)"; });
        dropZone.addEventListener('dragleave', () => dropZone.style.borderColor = "var(--border)");
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = "var(--border)";
            if(e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
        });
        fileInput.addEventListener('change', (e) => {
            if(e.target.files.length) handleFile(e.target.files[0]);
        });

        document.getElementById('remove-file-btn').onclick = () => {
            appData.extractedText = "";
            appData.fileName = "";
            filePreview.style.display = 'none';
            dropZone.style.display = 'block';
            checkReadyState();
        };

        async function handleFile(file) {
            appData.fileName = file.name;
            document.getElementById('file-name').innerText = file.name;
            document.getElementById('file-size').innerText = (file.size / 1024).toFixed(1) + " KB";
            dropZone.style.display = 'none';
            filePreview.style.display = 'flex';
            
            if(file.type === 'application/pdf') {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
                    let fullText = "";
                    for(let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const content = await page.getTextContent();
                        fullText += content.items.map(item => item.str).join(" ") + " ";
                    }
                    appData.extractedText = fullText;
                    checkReadyState();
                } catch(err) {
                    alert("שגיאה בקריאת קובץ ה-PDF. נסה להדביק טקסט במקום.");
                }
            } else {
                // For demo, fallback if not PDF
                appData.extractedText = "תוכן קובץ דמו: " + file.name;
                checkReadyState();
            }
        }

        /* --- ENGINE: GENERATE QUESTIONS FROM TEXT --- */
        startBtn.addEventListener('click', () => {
            showScreen('screen-loading');
            
            const msgs = ["מנתח את הטקסט...", "מזהה מושגי מפתח...", "מרכיב שאלות אדפטיביות...", "מכין דוח שליטה..."];
            let i = 0;
            const msgEl = document.getElementById('loading-msg');
            const interval = setInterval(() => {
                msgEl.innerText = msgs[++i % msgs.length];
            }, 3000);

            setTimeout(() => {
                clearInterval(interval);
                generateSmartMockQuestions();
                startQuiz();
            }, 4500);
        });

        // This engine extracts real words from the user's text to build the quiz
        function generateSmartMockQuestions() {
            const text = appData.extractedText || pasteArea.value;
            // Extract Hebrew words larger than 4 chars for concepts
            const words = text.split(/[\s,.\n]+/).filter(w => w.length > 4 && /^[\u0590-\u05FF]+$/.test(w));
            
            appData.questions = [];
            for(let i=0; i<appData.qty; i++) {
                // Pick a random concept from their text
                let concept = words.length > 5 ? words[Math.floor(Math.random() * words.length)] : "מושג " + (i+1);
                
                appData.questions.push({
                    id: i,
                    concept: concept,
                    text: `בהתבסס על החומר שהעלית, מהי המשמעות המרכזית של "${concept}" בהקשר שלנו?`,
                    options: [
                        { text: `התשובה הנכונה ביותר לגבי ${concept} כפי שמופיע בטקסט`, isCorrect: true },
                        { text: `אפשרות מסיחה שנשמעת הגיונית אך אינה נכונה`, isCorrect: false },
                        { text: `מסיח המבוסס על טעות נפוצה הקשורה ל-${concept}`, isCorrect: false },
                        { text: `הסבר אחר לגמרי שלא רלוונטי להקשר`, isCorrect: false }
                    ].sort(() => Math.random() - 0.5),
                    explanation: `בטקסט המקורי, המושג ${concept} מתואר כחלק קריטי מהתהליך. טעות נפוצה היא לבלבל אותו עם מושגים דומים.`,
                    tip: `קשר את המילה "${concept}" למילת המפתח "בסיס" כדי לזכור בקלות.`
                });
            }
        }

        function showScreen(id) {
            document.querySelectorAll('.app-screen').forEach(s => s.classList.remove('active'));
            document.getElementById(id).classList.add('active');
        }

        /* --- QUIZ LOGIC --- */
        function startQuiz() {
            appData.currentIndex = 0;
            appData.score = 0;
            appData.wrongAnswers = [];
            renderQuestion();
            showScreen('screen-quiz');
        }

        function renderQuestion() {
            const q = appData.questions[appData.currentIndex];
            document.getElementById('q-counter').innerText = `שאלה ${appData.currentIndex + 1} מתוך ${appData.questions.length}`;
            document.getElementById('p-bar').style.width = `${((appData.currentIndex) / appData.questions.length) * 100}%`;
            
            // Set difficulty badge based on settings
            const badge = document.getElementById('difficulty-badge');
            if(appData.difficulty === 'hard') { badge.innerText = "מאסטרי"; badge.style.background = "var(--danger)"; }
            else if(appData.difficulty === 'easy') { badge.innerText = "בסיסי"; badge.style.background = "var(--success)"; }
            else { badge.innerText = "אנליטי"; badge.style.background = "var(--warning)"; }

            document.getElementById('concept-tag').innerText = q.concept;
            document.getElementById('question-text').innerText = q.text;
            
            const list = document.getElementById('options-list');
            list.innerHTML = "";
            document.getElementById('feedback-card').style.display = 'none';

            const letters = ['א', 'ב', 'ג', 'ד'];
            q.options.forEach((opt, idx) => {
                const btn = document.createElement('button');
                btn.className = 'answer-btn';
                btn.innerHTML = `<span class="letter">${letters[idx]}</span> <span>${opt.text}</span>`;
                btn.onclick = () => handleAnswer(opt, btn, q);
                list.appendChild(btn);
            });
            
            // Re-trigger animation
            const container = document.getElementById('question-container');
            container.style.animation = 'none';
            container.offsetHeight; /* trigger reflow */
            container.style.animation = null; 
        }

        function handleAnswer(opt, btn, q) {
            const allBtns = document.querySelectorAll('.answer-btn');
            allBtns.forEach(b => b.disabled = true);

            if(opt.isCorrect) {
                btn.classList.add('correct');
                appData.score++;
                document.getElementById('feedback-title').innerText = "✅ תשובה נכונה!";
                document.getElementById('feedback-title').style.color = "var(--success)";
                document.getElementById('feedback-card').style.borderColor = "var(--success)";
            } else {
                btn.classList.add('wrong');
                appData.wrongAnswers.push(q);
                document.getElementById('feedback-title').innerText = "❌ לא מדויק";
                document.getElementById('feedback-title').style.color = "var(--danger)";
                document.getElementById('feedback-card').style.borderColor = "var(--danger)";
                // Highlight correct one
                allBtns.forEach((b, i) => {
                    if(q.options[i].isCorrect) b.classList.add('correct');
                });
            }

            allBtns.forEach(b => {
                if(!b.classList.contains('correct') && !b.classList.contains('wrong')) b.classList.add('faded');
            });

            document.getElementById('feedback-text').innerText = q.explanation;
            document.getElementById('tip-text').innerText = q.tip;
            document.getElementById('feedback-card').style.display = 'block';
        }

        document.getElementById('next-q-btn').addEventListener('click', () => {
            appData.currentIndex++;
            if(appData.currentIndex < appData.questions.length) {
                renderQuestion();
            } else {
                showResults();
            }
        });

        /* --- RESULTS LOGIC --- */
        function showResults() {
            showScreen('screen-results');
            const total = appData.questions.length;
            const percent = Math.round((appData.score / total) * 100);
            
            // Mastery Ring Animation
            const circle = document.getElementById('score-circle');
            const offset = 440 - (440 * percent / 100);
            setTimeout(() => {
                circle.style.strokeDashoffset = offset;
            }, 100);

            document.getElementById('score-num').innerText = percent + "%";
            document.getElementById('stat-correct').innerText = appData.score;
            document.getElementById('stat-wrong').innerText = appData.wrongAnswers.length;
            document.getElementById('stat-total').innerText = total;

            // Labels
            const labels = [
                { min: 90, txt: "מצוין! 🏆", color: "var(--success)", streak: "🔥 רצף מעולה! בוא שוב מחר" },
                { min: 75, txt: "טוב מאוד! 🎯", color: "var(--accent)", streak: "⚡ כל סשן בונה את הרצף שלך" },
                { min: 60, txt: "סביר 📚", color: "var(--warning)", streak: "💪 כמעט שם, נסה סבב נוסף" },
                { min: 0, txt: "זקוק לחיזוק 💪", color: "var(--danger)", streak: "🧠 מטעויות לומדים הכי טוב" }
            ];
            const label = labels.find(l => percent >= l.min);
            document.getElementById('result-label').innerText = label.txt;
            document.getElementById('result-label').style.color = label.color;
            document.getElementById('streak-msg').innerText = label.streak;

            // Knowledge Gaps
            const gapsContainer = document.getElementById('gaps-container');
            const gapsList = document.getElementById('gaps-list');
            gapsList.innerHTML = "";
            
            if(appData.wrongAnswers.length > 0) {
                gapsContainer.style.display = 'block';
                // Extract unique concepts
                const concepts = [...new Set(appData.wrongAnswers.map(q => q.concept))];
                concepts.forEach(c => {
                    const el = document.createElement('span');
                    el.style.background = 'rgba(248, 113, 113, 0.1)';
                    el.style.color = 'var(--danger)';
                    el.style.padding = '4px 10px';
                    el.style.borderRadius = '8px';
                    el.style.fontSize = '0.8rem';
                    el.innerText = "🔴 " + c;
                    gapsList.appendChild(el);
                });
            } else {
                gapsContainer.style.display = 'none';
            }

            // Action Plan
            const planList = document.getElementById('action-plan-list');
            planList.innerHTML = `
                <div style="background:rgba(124,107,255,0.1); padding:15px; border-radius:12px; margin-bottom:10px; display:flex; gap:12px; align-items:center;">
                    <span style="background:var(--accent); color:white; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-weight:900; flex-shrink:0;">1</span>
                    <span style="font-size:0.9rem;">${percent < 100 ? 'חזור על המושגים המסומנים באדום למעלה.' : 'סכם את החומר לחבר כדי לקבע את הידע.'}</span>
                </div>
                <div style="background:rgba(124,107,255,0.1); padding:15px; border-radius:12px; margin-bottom:10px; display:flex; gap:12px; align-items:center;">
                    <span style="background:var(--accent); color:white; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-weight:900; flex-shrink:0;">2</span>
                    <span style="font-size:0.9rem;">בצע סבב שאלות נוסף מחר (Spaced Repetition).</span>
                </div>
                <div style="background:rgba(124,107,255,0.1); padding:15px; border-radius:12px; margin-bottom:10px; display:flex; gap:12px; align-items:center;">
                    <span style="background:var(--accent); color:white; width:24px; height:24px; display:flex; align-items:center; justify-content:center; border-radius:50%; font-weight:900; flex-shrink:0;">3</span>
                    <span style="font-size:0.9rem;">נסה לפתור את שאלת המאסטרי (למטה) ללא חומר עזר.</span>
                </div>
            `;

            // Challenge Question
            const challenge = appData.wrongAnswers.length > 0 ? 
                appData.wrongAnswers[0].text : 
                `הסבר במילים שלך את החשיבות של "${appData.questions[0].concept}".`;
            document.getElementById('challenge-q').innerText = challenge;
        }

        document.getElementById('restart-quiz-btn').addEventListener('click', () => {
            showScreen('screen-loading');
            generateSmartMockQuestions(); // Generate fresh questions based on same text
            setTimeout(startQuiz, 1500);
        });
