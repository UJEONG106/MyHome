// board.js - Board Specific Logic
document.addEventListener('DOMContentLoaded', () => {
    initBoard();
});

function initBoard() {
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

    window.deletePost = function(index) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            posts.splice(index, 1);
            localStorage.setItem('portfolio_posts', JSON.stringify(posts));
            if (typeof showToast === 'function') showToast('게시물이 삭제되었습니다.');
            renderPosts();
        } catch(e) { console.error('Delete failed:', e); }
    };

    window.editPost = function(index) {
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            const post = posts[index];
            if (!post) return;
            document.getElementById('board-name').value = post.name;
            document.getElementById('board-email').value = post.email;
            document.getElementById('board-content').value = post.content;
            boardEditIndex.value = index;
            window.toggleBoardView(true);
        } catch(e) { console.error('Edit failed:', e); }
    };

    window.handleVote = function(index, type) {
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            if (!posts[index].likes) posts[index].likes = 0;
            if (!posts[index].dislikes) posts[index].dislikes = 0;
            
            if (type === 'like') posts[index].likes++;
            else posts[index].dislikes++;
            
            localStorage.setItem('portfolio_posts', JSON.stringify(posts));
            renderPosts();
        } catch(e) { console.error('Vote failed:', e); }
    };

    window.addComment = function(index) {
        const input = document.getElementById(`comment-input-${index}`);
        const text = input.value.trim();
        if (!text) return;
        
        try {
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            if (!posts[index].comments) posts[index].comments = [];
            
            posts[index].comments.push({
                author: '방문자',
                text: text,
                date: new Date().toLocaleString('ko-KR')
            });
            
            localStorage.setItem('portfolio_posts', JSON.stringify(posts));
            renderPosts();
        } catch(e) { console.error('Comment failed:', e); }
    };

    function renderPosts() {
        try {
            const posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            if (posts.length === 0) {
                boardList.innerHTML = '<div class="board-empty" style="text-align:center; padding: 40px; color: var(--text-secondary);">아직 게시물이 없습니다. 첫 질문을 남겨보세요!</div>';
                return;
            }

            const html = posts.slice().reverse().map((post, revIdx) => {
                const originalIndex = posts.length - 1 - revIdx;
                const likes = post.likes || 0;
                const dislikes = post.dislikes || 0;
                const comments = post.comments || [];
                
                let commentsHtml = comments.map(c => `
                    <div class="comment-item" style="padding: 10px; border-bottom: 1px solid rgba(255,255,255,0.05); font-size: 0.85rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                            <span style="color:var(--accent-blue); font-weight:600;">${escapeHtml(c.author)}</span>
                            <span style="color:var(--text-secondary); font-size:0.75rem;">${c.date}</span>
                        </div>
                        <div style="color:var(--text-primary);">${escapeHtml(c.text)}</div>
                    </div>
                `).join('');

                return `
                    <div class="board-post glass-card animate-fade visible" style="margin-bottom: 30px; padding: 25px;">
                        <div class="post-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; margin-bottom: 15px;">
                            <span class="post-author" style="font-weight: 800; color: var(--accent-blue); font-size:1.1rem;">${escapeHtml(post.name)}</span>
                            <span class="post-date" style="font-size: 0.8rem; color: var(--text-secondary);">${post.date}</span>
                        </div>
                        <div class="post-content" style="white-space: pre-wrap; font-size:1rem; line-height:1.6; color:#fff; min-height:60px;">${escapeHtml(post.content)}</div>
                        
                        <div class="post-engagement" style="display: flex; gap: 20px; margin-top: 20px; padding: 15px 0; border-top: 1px solid var(--glass-border);">
                            <button class="vote-btn like" onclick="handleVote(${originalIndex}, 'like')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:color 0.3s;">
                                <i class="fas fa-thumbs-up" style="font-size:1.1rem;"></i> <span>${likes}</span>
                            </button>
                            <button class="vote-btn dislike" onclick="handleVote(${originalIndex}, 'dislike')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:color 0.3s;">
                                <i class="fas fa-thumbs-down" style="font-size:1.1rem;"></i> <span>${dislikes}</span>
                            </button>
                        </div>

                        <div class="comment-section" style="background:rgba(0,0,0,0.2); border-radius:12px; margin-top:15px; overflow:hidden;">
                            <div class="comment-list">
                                ${commentsHtml}
                            </div>
                            <div class="comment-input-area" style="padding:15px; display:flex; gap:10px; border-top: 1px solid rgba(255,255,255,0.05);">
                                <input type="text" id="comment-input-${originalIndex}" placeholder="댓글을 입력하세요..." style="flex:1; background:rgba(255,255,255,0.05); border:1px solid var(--glass-border); border-radius:8px; padding:8px 12px; color:#fff; font-size:0.9rem;">
                                <button onclick="addComment(${originalIndex})" style="background:var(--accent-blue); border:none; color:#000; padding:8px 15px; border-radius:8px; cursor:pointer; font-weight:700; font-size:0.85rem;">등록</button>
                            </div>
                        </div>

                        <div class="post-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 20px;">
                            <button class="action-btn edit" onclick="editPost(${originalIndex})" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-edit"></i> 수정</button>
                            <button class="action-btn delete" onclick="deletePost(${originalIndex})" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-trash"></i> 삭제</button>
                        </div>
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
            const index = parseInt(boardEditIndex.value);
            const date = new Date().toLocaleString('ko-KR');
            let posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            if (index === -1) {
                posts.push({ name, email, content, date });
                if (typeof showToast === 'function') showToast('게시물이 등록되었습니다.');
            } else {
                posts[index] = { ...posts[index], name, email, content, date: `${date} (수정됨)` };
                if (typeof showToast === 'function') showToast('게시물이 수정되었습니다.');
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
