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

    function renderPosts() {
        try {
            const posts = JSON.parse(localStorage.getItem('portfolio_posts') || '[]');
            console.log('Rendering posts:', posts.length);
            
            if (posts.length === 0) {
                boardList.innerHTML = '<div class="board-empty" style="text-align:center; padding: 40px; color: var(--text-secondary);">아직 게시물이 없습니다. 첫 질문을 남겨보세요!</div>';
                return;
            }

            // Generate HTML
            const html = posts.slice().reverse().map((post, revIdx) => {
                const originalIndex = posts.length - 1 - revIdx;
                return `
                    <div class="board-post glass-card animate-fade visible" style="margin-bottom: 20px; padding: 20px; opacity: 1; transform: translateY(0);">
                        <div class="post-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 10px; margin-bottom: 10px;">
                            <span class="post-author" style="font-weight: 800; color: var(--accent-blue);">${escapeHtml(post.name)}</span>
                            <span class="post-date" style="font-size: 0.8rem; color: var(--text-secondary);">${post.date}</span>
                        </div>
                        <div class="post-content" style="white-space: pre-wrap;">${escapeHtml(post.content)}</div>
                        <div class="post-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; padding-top: 10px; border-top: 1px solid var(--glass-border);">
                            <button class="action-btn edit" onclick="editPost(${originalIndex})" style="background:transparent; border: 1px solid var(--accent-blue); color: var(--accent-blue); padding: 5px 12px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-edit"></i> 수정</button>
                            <button class="action-btn delete" onclick="deletePost(${originalIndex})" style="background:transparent; border: 1px solid #ff5f56; color: #ff5f56; padding: 5px 12px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-trash"></i> 삭제</button>
                        </div>
                    </div>
                `;
            }).join('');
            
            boardList.innerHTML = html;
            
            // Re-trigger observer for any animate-fade elements that might need it, 
            // though we added 'visible' and inline styles above for safety.
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
