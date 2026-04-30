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

    // 5. Vote (Like/Dislike) with Toggle & Local Storage Protection
    window.handleVote = async function(id, type, currentCount) {
        const voteKey = `voted_${id}`;
        const previousVote = localStorage.getItem(voteKey);

        try {
            const postRef = doc(db, "posts", id);
            let updateData = {};

            if (previousVote === type) {
                // Toggle OFF: Clicked the same button again
                updateData[type === 'like' ? 'likes' : 'dislikes'] = Math.max(0, currentCount - 1);
                await updateDoc(postRef, updateData);
                localStorage.removeItem(voteKey);
                if (typeof showToast === 'function') showToast('투표를 취소했습니다.');
            } else if (previousVote) {
                // Already voted for the OTHER type
                if (typeof showToast === 'function') showToast('이미 다른 항목에 투표하셨습니다.');
                return;
            } else {
                // New Vote
                updateData[type === 'like' ? 'likes' : 'dislikes'] = currentCount + 1;
                await updateDoc(postRef, updateData);
                localStorage.setItem(voteKey, type);
                if (typeof showToast === 'function') showToast('투표가 반영되었습니다.');
            }
        } catch (error) {
            console.error("Error voting:", error);
        }
    };

    // 6. Add Comment
    window.addComment = async function(postId) {
        const input = document.getElementById(`comment-input-${postId}`);
        const content = input.value.trim();
        if (!content) return;

        try {
            const postRef = doc(db, "posts", postId);
            const { arrayUnion } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js");
            
            await updateDoc(postRef, {
                comments: arrayUnion({
                    author: "익명",
                    content: content,
                    createdAt: new Date().toISOString(),
                    likes: 0,
                    dislikes: 0
                })
            });
            input.value = '';
            if (typeof showToast === 'function') showToast('댓글이 등록되었습니다.');
        } catch (error) {
            console.error("Error adding comment:", error);
            alert("댓글 저장 중 오류가 발생했습니다.");
        }
    };

    // 7. Comment Vote Toggle
    window.handleCommentVote = async function(postId, commentIndex, type) {
        const voteKey = `voted_comment_${postId}_${commentIndex}`;
        const previousVote = localStorage.getItem(voteKey);

        try {
            const postRef = doc(db, "posts", postId);
            // We need to get the whole array to update a specific index (Firestore limitation for nested arrays)
            const { getDoc } = await import("https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js");
            const snap = await getDoc(postRef);
            if (!snap.exists()) return;
            
            const comments = snap.data().comments || [];
            const comment = comments[commentIndex];
            if (!comment) return;

            if (previousVote === type) {
                // Cancel
                comment[type === 'like' ? 'likes' : 'dislikes'] = Math.max(0, (comment[type === 'like' ? 'likes' : 'dislikes'] || 0) - 1);
                localStorage.removeItem(voteKey);
                if (typeof showToast === 'function') showToast('댓글 투표를 취소했습니다.');
            } else if (previousVote) {
                if (typeof showToast === 'function') showToast('이미 투표하셨습니다.');
                return;
            } else {
                // Vote
                comment[type === 'like' ? 'likes' : 'dislikes'] = (comment[type === 'like' ? 'likes' : 'dislikes'] || 0) + 1;
                localStorage.setItem(voteKey, type);
                if (typeof showToast === 'function') showToast('댓글에 투표했습니다.');
            }

            await updateDoc(postRef, { comments });
        } catch (error) {
            console.error("Error comment voting:", error);
        }
    };

    // --- Rendering ---
    function renderPosts(posts) {
        if (posts.length === 0) {
            const emptyMsg = window.currentLang === 'en' ? 'No posts yet. Be the first to leave a question!' : '아직 게시물이 없습니다. 첫 질문을 남겨보세요!';
            boardList.innerHTML = `<div class="board-empty" style="text-align:center; padding: 40px; color: var(--text-secondary);">${emptyMsg}</div>`;
            return;
        }

        boardList.innerHTML = posts.map(post => {
            const date = post.createdAt ? new Date(post.createdAt.seconds * 1000).toLocaleString('ko-KR') : '방금 전';
            const commentsHtml = (post.comments || []).map((comment, idx) => `
                <div class="comment-item" style="padding: 10px; border-bottom: 1px solid var(--glass-border); font-size: 0.9rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                        <span style="color: var(--sk-orange); font-weight: 600;">${escapeHtml(comment.author)}</span>
                        <span style="color: var(--text-secondary); font-size: 0.7rem;">${new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div style="color: var(--text-primary); margin-bottom: 8px;">${escapeHtml(comment.content)}</div>
                    <div class="comment-votes" style="display: flex; gap: 12px; opacity: 0.8;">
                        <button onclick="handleCommentVote('${post.id}', ${idx}, 'like')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:4px;">
                            <i class="fas fa-thumbs-up"></i> ${comment.likes || 0}
                        </button>
                        <button onclick="handleCommentVote('${post.id}', ${idx}, 'dislike')" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.75rem; display:flex; align-items:center; gap:4px;">
                            <i class="fas fa-thumbs-down"></i> ${comment.dislikes || 0}
                        </button>
                    </div>
                </div>
            `).join('');

            return `
                <div class="board-post glass-card animate-fade visible" style="margin-bottom: 30px; padding: 25px;">
                    <div class="post-header" style="display: flex; justify-content: space-between; border-bottom: 1px solid var(--glass-border); padding-bottom: 12px; margin-bottom: 15px;">
                        <span class="post-author" style="font-weight: 800; color: var(--accent-blue); font-size:1.1rem;">${escapeHtml(post.name)}</span>
                        <span class="post-date" style="font-size: 0.8rem; color: var(--text-secondary);">${date}</span>
                    </div>
                    <div class="post-content" style="white-space: pre-wrap; font-size:1rem; line-height:1.6; color:var(--text-primary); min-height:60px;">${escapeHtml(post.content)}</div>
                    
                    <div class="post-engagement" style="display: flex; gap: 20px; margin-top: 20px; padding: 15px 0; border-top: 1px solid var(--glass-border);">
                        <button class="vote-btn like" onclick="handleVote('${post.id}', 'like', ${post.likes || 0})" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:all 0.3s;">
                            <i class="fas fa-thumbs-up" style="font-size:1.1rem;"></i> <span>${post.likes || 0}</span>
                        </button>
                        <button class="vote-btn dislike" onclick="handleVote('${post.id}', 'dislike', ${post.dislikes || 0})" style="background:transparent; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:8px; font-size:0.9rem; transition:all 0.3s;">
                            <i class="fas fa-thumbs-down" style="font-size:1.1rem;"></i> <span>${post.dislikes || 0}</span>
                        </button>
                    </div>

                    <!-- Comment Section -->
                    <div class="comment-section" style="background: rgba(120,120,120,0.05); border-radius: 8px; padding: 15px; margin-top: 10px;">
                        <div class="comment-list" id="comment-list-${post.id}">
                            ${commentsHtml}
                        </div>
                        <div class="comment-input-area" style="display: flex; gap: 10px; margin-top: 15px;">
                            <input type="text" id="comment-input-${post.id}" placeholder="${window.currentLang === 'en' ? 'Write a comment...' : '댓글을 입력하세요...'}" style="flex: 1; padding: 8px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--glass-border); border-radius: 4px; color: var(--text-primary);">
                            <button onclick="addComment('${post.id}')" style="background: var(--accent-blue); color: #fff; border: none; padding: 0 15px; border-radius: 4px; cursor: pointer; font-weight: 800;">${window.currentLang === 'en' ? 'Post' : '등록'}</button>
                        </div>
                    </div>

                    <div class="post-footer" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">
                        <button class="action-btn edit" onclick="editPost('${post.id}', '${post.name}', '${post.email}', '${post.content.replace(/'/g, "\\'")}')" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-edit"></i> ${window.currentLang === 'en' ? 'Edit' : '수정'}</button>
                        <button class="action-btn delete" onclick="deletePost('${post.id}')" style="background:transparent; border: 1px solid var(--glass-border); color: var(--text-secondary); padding: 5px 12px; border-radius:6px; cursor:pointer; font-size:0.8rem;"><i class="fas fa-trash"></i> ${window.currentLang === 'en' ? 'Delete' : '삭제'}</button>
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
