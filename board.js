// board.js - Firebase Firestore Logic
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    getDocs, 
    doc, 
    updateDoc, 
    deleteDoc, 
    query, 
    orderBy, 
    serverTimestamp,
    onSnapshot 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    initBoard();
});

async function initBoard() {
    const boardForm = document.getElementById('board-form');
    const boardList = document.getElementById('board-list');
    const boardListView = document.getElementById('board-list-view');
    const boardFormView = document.getElementById('board-form-view');
    const btnShowWrite = document.getElementById('btn-show-write');
    const btnCancelWrite = document.getElementById('btn-cancel-write');
    const boardEditId = document.getElementById('board-edit-index'); // Renamed conceptually to ID

    if (!boardList) return;

    // --- View Toggle ---
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
            if(boardEditId) boardEditId.value = "-1";
        }
    };

    if (btnShowWrite) btnShowWrite.addEventListener('click', () => window.toggleBoardView(true));
    if (btnCancelWrite) btnCancelWrite.addEventListener('click', () => window.toggleBoardView(false));

    // --- CRUD Operations ---

    // 1. Listen for real-time updates (Read)
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    onSnapshot(q, (snapshot) => {
        const posts = [];
        snapshot.forEach((doc) => {
            posts.push({ id: doc.id, ...doc.data() });
        });
        renderPosts(posts);
    });

    // 2. Submit / Update Post (Create/Update)
    if (boardForm) {
        boardForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('board-name').value;
            const email = document.getElementById('board-email').value;
            const content = document.getElementById('board-content').value;
            const editId = boardEditId.value;

            try {
                if (editId === "-1") {
                    // Create
                    await addDoc(collection(db, "posts"), {
                        name,
                        email,
                        content,
                        createdAt: serverTimestamp(),
                        likes: 0,
                        dislikes: 0,
                        comments: []
                    });
                    if (typeof showToast === 'function') showToast('게시물이 등록되었습니다.');
                } else {
                    // Update
                    await updateDoc(doc(db, "posts", editId), {
                        name,
                        email,
                        content,
                        updatedAt: serverTimestamp()
                    });
                    if (typeof showToast === 'function') showToast('게시물이 수정되었습니다.');
                }
                window.toggleBoardView(false);
            } catch (error) {
                console.error("Error saving post:", error);
                alert("저장 중 오류가 발생했습니다.");
            }
        });
    }

    // 3. Delete Post
    window.deletePost = async function(id) {
        if (!confirm('정말 삭제하시겠습니까?')) return;
        try {
            await deleteDoc(doc(db, "posts", id));
            if (typeof showToast === 'function') showToast('게시물이 삭제되었습니다.');
        } catch (error) {
            console.error("Error deleting post:", error);
        }
    };

    // 4. Edit Post (Prepare for update)
    window.editPost = function(id, name, email, content) {
        document.getElementById('board-name').value = name;
        document.getElementById('board-email').value = email;
        document.getElementById('board-content').value = content;
        boardEditId.value = id;
        window.toggleBoardView(true);
    };

    // 5. Vote (Like/Dislike)
    window.handleVote = async function(id, type, currentCount) {
        try {
            const postRef = doc(db, "posts", id);
            const increment = type === 'like' ? { likes: currentCount + 1 } : { dislikes: currentCount + 1 };
            await updateDoc(postRef, increment);
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    // --- Rendering ---
    function renderPosts(posts) {
        if (posts.length === 0) {
            boardList.innerHTML = '<div class="board-empty" style="text-align:center; padding: 40px; color: var(--text-secondary);">아직 게시물이 없습니다. 첫 질문을 남겨보세요!</div>';
            return;
        }

        boardList.innerHTML = posts.map(post => {
            const date = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString('ko-KR') : '방금 전';
            return `
                <div class="board-post glass-card animate-fade visible" style="margin-bottom: 30px; padding: 25px;">
                    <div class="post-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; margin-bottom: 15px;">
                        <span class="post-author" style="font-weight: 800; color: var(--accent-blue); font-size:1.1rem;">${escapeHtml(post.name)}</span>
                        <span class="post-date" style="font-size: 0.8rem; color: var(--text-secondary);">${date}</span>
                    </div>
                    <div class="post-content" style="white-space: pre-wrap; font-size:1rem; line-height:1.6; color:#fff; min-height:60px;">${escapeHtml(post.content)}</div>
                    
                    <div class="post-engagement" style="display: flex; gap: 20px; margin-top: 20px; padding: 15px 0; border-top: 1px solid var(--glass-border);">
                        <button class="vote-btn like" onclick="handleVote('${post.id}', 'like', ${post.likes || 0})" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:all 0.3s;">
                            <i class="fas fa-thumbs-up" style="font-size:1.1rem;"></i> <span>${post.likes || 0}</span>
                        </button>
                        <button class="vote-btn dislike" onclick="handleVote('${post.id}', 'dislike', ${post.dislikes || 0})" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:all 0.3s;">
                            <i class="fas fa-thumbs-down" style="font-size:1.1rem;"></i> <span>${post.dislikes || 0}</span>
                        </button>
                    </div>

                    <div class="post-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button class="action-btn edit" onclick="editPost('${post.id}', '${post.name}', '${post.email}', '${post.content.replace(/'/g, "\\'")}')" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-edit"></i> 수정</button>
                        <button class="action-btn delete" onclick="deletePost('${post.id}')" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-trash"></i> 삭제</button>
                    </div>
                </div>
            `;
        }).join('');
    }
}

function escapeHtml(text) {
    if (!text) return "";
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
