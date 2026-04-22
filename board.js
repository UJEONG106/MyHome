// board.js - Board Specific Logic
document.addEventListener('DOMContentLoaded', () => {
    initBoard();
});

function initBoard() {
    // 0. Initial Sample Data if empty or null
    const existingPosts = localStorage.getItem('portfolio_posts');
    if (!existingPosts || existingPosts === '[]') {
        const samplePosts = [
            {
                uid: "sample-1",
                name: "A",
                email: "visitor_a@example.com",
                content: "와! 멋져요. 포트폴리오 구성이 정말 전문적이네요!",
                date: new Date().toLocaleString('ko-KR'),
                likes: 5,
                dislikes: 0,
                comments: [
                    { author: "신우정", text: "감사합니다! 더 발전하는 모습 보여드리겠습니다.", date: new Date().toLocaleString('ko-KR') }
                ]
            },
            {
                uid: "sample-2",
                name: "B",
                email: "visitor_b@example.com",
                content: "완벽한 웹사이트! 기술 스택이 반도체 공정에 딱 맞는 것 같아요.",
                date: new Date().toLocaleString('ko-KR'),
                likes: 8,
                dislikes: 0,
                comments: []
            }
        ];
        localStorage.setItem('portfolio_posts', JSON.stringify(samplePosts));
    }

    // Temporary Cleanup for 'aa' by 'a'
    try {
        let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
        const filteredPosts = posts.filter(p => !(p.name === 'a' && p.content === 'aa'));
        if (posts.length !== filteredPosts.length) {
            localStorage.setItem('portfolio_posts', JSON.stringify(filteredPosts));
        }
    } catch(e) { console.error('Cleanup failed:', e); }

    window.handleCommentVote = function(postIndex, commentIndex, type) {
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const post = posts[postIndex];
            if (!post || !post.comments) return;
            const comment = post.comments[commentIndex];
            if (!comment) return;

            if (!comment.uid) comment.uid = "legacy-" + postIndex + "-" + commentIndex;

            let userVotes = JSON.parse(localStorage.getItem('portfolio_user_votes') || '{}');
            const currentVote = userVotes[comment.uid];

            if (!comment.likes) comment.likes = 0;
            if (!comment.dislikes) comment.dislikes = 0;

            if (currentVote === type) {
                if (type === 'like') comment.likes--;
                else comment.dislikes--;
                delete userVotes[comment.uid];
            } else {
                if (currentVote === 'like') comment.likes--;
                if (currentVote === 'dislike') comment.dislikes--;
                if (type === 'like') comment.likes++;
                else comment.dislikes++;
                userVotes[comment.uid] = type;
            }

            localStorage.setItem('portfolio_posts', JSON.stringify(posts));
            localStorage.setItem('portfolio_user_votes', JSON.stringify(userVotes));
            renderPosts();
        } catch(e) { console.error('Comment vote failed:', e); }
    };

    window.deleteComment = function(postUid, commentUid) {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const postIdx = posts.findIndex(p => p.uid === postUid);
            if (postIdx === -1) return;
            
            const commentIdx = posts[postIdx].comments.findIndex(c => c.uid === commentUid);
            if (commentIdx !== -1) {
                posts[postIdx].comments.splice(commentIdx, 1);
                localStorage.setItem('portfolio_posts', JSON.stringify(posts));
                renderPosts();
            }
        } catch(e) { console.error('Delete comment failed:', e); }
    };

    window.editComment = function(postUid, commentUid) {
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const postIdx = posts.findIndex(p => p.uid === postUid);
            if (postIdx === -1) return;
            
            const commentIdx = posts[postIdx].comments.findIndex(c => c.uid === commentUid);
            if (commentIdx === -1) return;
            
            const oldText = posts[postIdx].comments[commentIdx].text;
            const newText = prompt('댓글을 수정해 주세요:', oldText);
            
            if (newText !== null && newText.trim() !== '') {
                posts[postIdx].comments[commentIdx].text = newText.trim();
                posts[postIdx].comments[commentIdx].date = new Date().toLocaleString('ko-KR') + ' (수정됨)';
                localStorage.setItem('portfolio_posts', JSON.stringify(posts));
                renderPosts();
            }
        } catch(e) { console.error('Edit comment failed:', e); }
    };

    const boardForm = document.getElementById('board-form');
    const boardList = document.getElementById('board-list');
    const boardListView = document.getElementById('board-list-view');
    const boardFormView = document.getElementById('board-form-view');
    const btnShowWrite = document.getElementById('btn-show-write');
    const btnCancelWrite = document.getElementById('btn-cancel-write');
    const boardEditIndex = document.getElementById('board-edit-index');

    if (!boardList) return;

    window.toggleBoardView = function(showForm) {
        if (!boardListView || !boardFormView) return;
        if (showForm) {
            boardListView.style.display = 'none';
            boardFormView.style.display = 'block';
            boardFormView.classList.add('visible');
            boardFormView.querySelectorAll('.animate-fade').forEach(el => el.classList.add('visible'));
            if(btnShowWrite) btnShowWrite.style.display = 'none';
        } else {
            boardListView.style.display = 'block';
            boardFormView.style.display = 'none';
            if(btnShowWrite) btnShowWrite.style.display = 'inline-block';
            if(boardForm) boardForm.reset();
            if(boardEditIndex) boardEditIndex.value = "-1";
        }
    };

    if (btnShowWrite) btnShowWrite.addEventListener('click', () => window.toggleBoardView(true));
    if (btnCancelWrite) btnCancelWrite.addEventListener('click', () => window.toggleBoardView(false));

    window.deletePost = function(uid) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const index = posts.findIndex(p => p.uid === uid);
            if (index !== -1) {
                posts.splice(index, 1);
                localStorage.setItem('portfolio_posts', JSON.stringify(posts));
                if (typeof showToast === 'function') showToast('게시물이 삭제되었습니다.');
                renderPosts();
            }
        } catch(e) { console.error('Delete failed:', e); }
    };

    window.editPost = function(uid) {
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const post = posts.find(p => p.uid === uid);
            if (!post) return;
            document.getElementById('board-name').value = post.name;
            document.getElementById('board-email').value = post.email;
            document.getElementById('board-content').value = post.content;
            boardEditIndex.value = post.uid; // Now stores UID
            window.toggleBoardView(true);
        } catch(e) { console.error('Edit failed:', e); }
    };

    window.handleVote = function(index, type) {
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const post = posts[index];
            if (!post) return;
            
            // Generate UID if missing (for legacy posts)
            if (!post.uid) post.uid = post.date + Math.random();

            let userVotes = JSON.parse(localStorage.getItem('portfolio_user_votes') || '{}');
            const currentVote = userVotes[post.uid];

            if (!post.likes) post.likes = 0;
            if (!post.dislikes) post.dislikes = 0;

            if (currentVote === type) {
                // Cancel vote
                if (type === 'like') post.likes--;
                else post.dislikes--;
                delete userVotes[post.uid];
            } else {
                // Change or new vote
                if (currentVote === 'like') post.likes--;
                if (currentVote === 'dislike') post.dislikes--;
                
                if (type === 'like') post.likes++;
                else post.dislikes++;
                
                userVotes[post.uid] = type;
            }

            localStorage.setItem('portfolio_posts', JSON.stringify(posts));
            localStorage.setItem('portfolio_user_votes', JSON.stringify(userVotes));
            renderPosts();
        } catch(e) { console.error('Vote failed:', e); }
    };

    window.addComment = function(postUid) {
        const input = document.getElementById(`comment-input-${postUid}`);
        const text = input.value.trim();
        if (!text) return;
        
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const postIndex = posts.findIndex(p => p.uid === postUid);
            if (postIndex === -1) return;

            if (!posts[postIndex].comments) posts[postIndex].comments = [];
            
            const newComment = {
                uid: "comment-" + Date.now() + "-" + Math.random().toString(36).substr(2, 5),
                author: '방문자',
                text: text,
                date: new Date().toLocaleString('ko-KR'),
                likes: 0,
                dislikes: 0
            };
            posts[postIndex].comments.push(newComment);
            
            // Track my comment
            let myComments = JSON.parse(localStorage.getItem('portfolio_my_comments') || '[]');
            myComments.push(newComment.uid);
            localStorage.setItem('portfolio_my_comments', JSON.stringify(myComments));
            
            localStorage.setItem('portfolio_posts', JSON.stringify(posts));
            renderPosts();
        } catch(e) { console.error('Comment failed:', e); }
    };

    function renderPosts() {
        try {
            const posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const userVotes = JSON.parse(localStorage.getItem('portfolio_user_votes') || '{}');
            
            if (posts.length === 0) {
                boardList.innerHTML = '<div class="board-empty" style="text-align:center; padding: 40px; color: var(--text-secondary);">아직 게시물이 없습니다. 첫 질문을 남겨보세요!</div>';
                return;
            }

            const html = posts.slice().reverse().map((post, revIdx) => {
                const originalIndex = posts.length - 1 - revIdx;
                const likes = post.likes || 0;
                const dislikes = post.dislikes || 0;
                const comments = post.comments || [];
                
                let commentsHtml = comments.map((c, cIdx) => {
                    if (!c.uid) c.uid = "legacy-" + cIdx; // Legacy support
                    const cVote = userVotes[c.uid];
                    const myComments = JSON.parse(localStorage.getItem('portfolio_my_comments') || '[]');
                    const isMyComment = myComments.includes(c.uid);
                    const cLikes = c.likes || 0;
                    const cDislikes = c.dislikes || 0;

                    return `
                        <div class="comment-item" style="padding: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                                <span style="color:var(--accent-blue); font-weight:600;">${escapeHtml(c.author)}</span>
                                <span style="color:var(--text-secondary); font-size:0.75rem;">${c.date}</span>
                            </div>
                            <div style="color:var(--text-primary); margin-bottom:8px;">${escapeHtml(c.text)}</div>
                            <div class="comment-footer" style="display:flex; justify-content:space-between; align-items:center;">
                                <div class="comment-engagement" style="display:flex; gap:12px;">
                                    <button class="vote-btn like ${cVote === 'like' ? 'active' : ''}" onclick="handleCommentVote(${originalIndex}, ${cIdx}, 'like')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:5px; transition:all 0.3s;">
                                        <i class="fas fa-thumbs-up"></i> <span>${cLikes}</span>
                                    </button>
                                    <button class="vote-btn dislike ${cVote === 'dislike' ? 'active' : ''}" onclick="handleCommentVote(${originalIndex}, ${cIdx}, 'dislike')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:5px; transition:all 0.3s;">
                                        <i class="fas fa-thumbs-down"></i> <span>${cDislikes}</span>
                                    </button>
                                </div>
                                ${isMyComment ? `
                                    <div class="comment-actions" style="display:flex; gap:8px;">
                                        <button onclick="editComment('${post.uid}', '${c.uid}')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.7rem; opacity:0.6;"><i class="fas fa-edit"></i> 수정</button>
                                        <button onclick="deleteComment('${post.uid}', '${c.uid}')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.7rem; opacity:0.6;"><i class="fas fa-trash"></i> 삭제</button>
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    `;
                }).join('');

                const myPosts = JSON.parse(localStorage.getItem('portfolio_my_posts') || '[]');
                const isMyPost = myPosts.includes(post.uid);
                const myVote = userVotes[post.uid];

                return `
                    <div class="board-post glass-card animate-fade visible" style="margin-bottom: 30px; padding: 25px;">
                        <div class="post-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; margin-bottom: 15px;">
                            <span class="post-author" style="font-weight: 800; color: var(--accent-blue); font-size:1.1rem;">${escapeHtml(post.name)}</span>
                            <span class="post-date" style="font-size: 0.8rem; color: var(--text-secondary);">${post.date}</span>
                        </div>
                        <div class="post-content" style="white-space: pre-wrap; font-size:1rem; line-height:1.6; color:#fff; min-height:60px;">${escapeHtml(post.content)}</div>
                        
                        <div class="post-engagement" style="display: flex; gap: 20px; margin-top: 20px; padding: 15px 0; border-top: 1px solid var(--glass-border);">
                            <button class="vote-btn like ${myVote === 'like' ? 'active' : ''}" onclick="handleVote(${originalIndex}, 'like')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:all 0.3s;">
                                <i class="fas fa-thumbs-up" style="font-size:1.1rem;"></i> <span>${likes}</span>
                            </button>
                            <button class="vote-btn dislike ${myVote === 'dislike' ? 'active' : ''}" onclick="handleVote(${originalIndex}, 'dislike')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:all 0.3s;">
                                <i class="fas fa-thumbs-down" style="font-size:1.1rem;"></i> <span>${dislikes}</span>
                            </button>
                        </div>

                        <div class="comment-section" style="background:rgba(0,0,0,0.2); border-radius:12px; margin-top:15px; overflow:hidden;">
                            <div class="comment-list">
                                ${commentsHtml}
                            </div>
                            <div class="comment-input-area" style="padding:15px; display:flex; gap:10px; border-top: 1px solid rgba(255,255,255,0.05);">
                                <input type="text" id="comment-input-${post.uid}" placeholder="댓글을 입력하세요..." style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:8px; padding:8px 12px; color:#fff; font-size:0.9rem;">
                                <button onclick="addComment('${post.uid}')" style="background:var(--accent-blue); border:none; color:#000; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.85rem;">등록</button>
                            </div>
                        </div>

                        ${isMyPost ? `
                            <div class="post-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                                <button class="action-btn edit" onclick="editPost('${post.uid}')" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-edit"></i> 수정</button>
                                <button class="action-btn delete" onclick="deletePost('${post.uid}')" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-trash"></i> 삭제</button>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
            
            boardList.innerHTML = html;
        } catch(e) { 
            console.error('Render failed:', e); 
            boardList.innerHTML = '<div class="error">게시물을 불러오는 중 오류가 발생했습니다.</div>';
        }
    }

    if (boardForm) {
        boardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('board-name').value;
            const email = document.getElementById('board-email').value;
            const content = document.getElementById('board-content').value;
            
            // Email Validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                if (typeof showToast === 'function') showToast('올바른 이메일 형식을 입력해주세요.');
                return;
            }

            const indexValue = boardEditIndex.value; // Now stores UID if editing
            const date = new Date().toLocaleString('ko-KR');
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');

            if (indexValue === "-1") {
                // New post
                const uid = Date.now() + "-" + Math.random().toString(36).substr(2, 9);
                posts.push({ uid, name, email, content, date });
                
                let myPosts = JSON.parse(localStorage.getItem('portfolio_my_posts') || '[]');
                myPosts.push(uid);
                localStorage.setItem('portfolio_my_posts', JSON.stringify(myPosts));

                if (typeof showToast === 'function') showToast('게시물이 등록되었습니다.');
            } else {
                // Edit existing post by UID
                const postIdx = posts.findIndex(p => p.uid === indexValue);
                if (postIdx !== -1) {
                    posts[postIdx] = { ...posts[postIdx], name, email, content, date: `${date} (수정됨)` };
                    if (typeof showToast === 'function') showToast('게시물이 수정되었습니다.');
                }
            }
            localStorage.setItem('portfolio_posts', JSON.stringify(posts));
            window.toggleBoardView(false);
            renderPosts();
        });
    }

    renderPosts();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
