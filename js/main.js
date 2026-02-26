// 页面加载动画
document.addEventListener('DOMContentLoaded', function() {
    // 观察器：用于触发内容区域的淡入动画
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);

    // 观察所有内容区域
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        observer.observe(section);
    });

    // 平滑滚动
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // ========== Supabase 留言板功能 ==========
    // Supabase 配置
    const SUPABASE_URL = 'https://hcgffgdgcyitzdkyjsrz.supabase.co';
    const SUPABASE_KEY = 'sb_publishable_3WAKZiysc0KM_3rWR1152g_KXDltz9h';
    
    // 初始化 Supabase 客户端
    let supabase = null;
    if (typeof window.supabase !== 'undefined') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    }

    // 格式化时间显示
    function formatTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        
        // 1分钟内
        if (diff < 60000) return '刚刚';
        // 1小时内
        if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前';
        // 24小时内
        if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前';
        // 超过24小时显示日期
        return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    // 加载留言列表
    async function loadMessages() {
        const messagesList = document.getElementById('messages-list');
        if (!messagesList || !supabase) return;

        try {
            // 从 Supabase 获取留言，按时间倒序
            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) throw error;

            // 如果没有留言
            if (!data || data.length === 0) {
                messagesList.innerHTML = '<p class="no-messages">暂无留言，快来发布第一条留言吧！</p>';
                return;
            }

            // 渲染留言列表（包含运营者回复）
            messagesList.innerHTML = data.map(msg => `
                <div class="message-item">
                    <div class="message-header">
                        <span class="message-author">${escapeHtml(msg.name)}</span>
                
                    </div>
                    <div class="message-body">${escapeHtml(msg.content)}</div>
                    ${msg.reply ? `
                    <div class="message-reply">
                        <span class="reply-label">🎓 运营者回复：</span>
                        <span class="reply-content">${escapeHtml(msg.reply)}</span>
                    </div>
                    ` : ''}
                </div>
            `).join('');

        } catch (err) {
            console.error('加载留言失败:', err);
            messagesList.innerHTML = '<p class="no-messages">留言加载失败，请刷新页面重试</p>';
        }
    }

    // HTML 转义防止 XSS 攻击
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 留言表单提交
    const messageForm = document.getElementById('message-form');
    if (messageForm && supabase) {
        messageForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const submitBtn = messageForm.querySelector('.submit-btn');
            const name = document.getElementById('message-name').value.trim();
            const email = document.getElementById('message-email').value.trim();
            const content = document.getElementById('message-content').value.trim();

            // 验证表单
            if (!name || !content) {
                alert('请填写姓名和留言内容');
                return;
            }

            // 禁用按钮防止重复提交
            submitBtn.disabled = true;
            submitBtn.textContent = '发布中...';

            try {
                // 提交到 Supabase
                const { error } = await supabase
                    .from('messages')
                    .insert([{ name, email: email || null, content }]);

                if (error) throw error;

                // 成功后清空表单并刷新列表
                messageForm.reset();
                await loadMessages();
                
            } catch (err) {
                console.error('提交留言失败:', err);
                alert('留言提交失败，请稍后重试');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = '发布留言';
            }
        });

        // 页面加载时获取留言列表
        loadMessages();
    }
});

// 图片加载错误处理（当图片不存在时显示占位符）
document.addEventListener('DOMContentLoaded', function() {
    const images = document.querySelectorAll('img');
    images.forEach(img => {
        img.addEventListener('error', function() {
            // 如果图片加载失败，可以设置一个默认的占位符
            this.style.backgroundColor = '#f0f0f0';
            this.style.display = 'flex';
            this.style.alignItems = 'center';
            this.style.justifyContent = 'center';
            this.alt = '图片占位符';
        });
    });

    // 轮播图功能
    const carouselLinks = document.querySelectorAll('.carousel-link');
    const carouselSlides = document.querySelectorAll('.carousel-slide');
    const indicators = document.querySelectorAll('.indicator');
    let currentSlide = 0;
    let carouselInterval;

    // 切换到指定幻灯片
    function goToSlide(index) {
        carouselSlides[currentSlide].classList.remove('active');
        indicators[currentSlide].classList.remove('active');
        
        currentSlide = index;
        
        carouselSlides[currentSlide].classList.add('active');
        indicators[currentSlide].classList.add('active');
        
        // 更新z-index，确保当前显示的链接在最上层
        carouselLinks.forEach((link, i) => {
            if (i === currentSlide) {
                link.style.zIndex = '2';
            } else {
                link.style.zIndex = '0';
            }
        });
    }

    // 下一张
    function nextSlide() {
        const next = (currentSlide + 1) % carouselSlides.length;
        goToSlide(next);
    }

    // 自动播放
    function startCarousel() {
        carouselInterval = setInterval(nextSlide, 5000); // 每5秒切换，统一时间
    }

    // 停止自动播放
    function stopCarousel() {
        clearInterval(carouselInterval);
    }

    // 指示器点击事件：仅手动切换页，不启动自动轮播
    if (indicators.length > 0) {
        indicators.forEach((indicator, index) => {
            indicator.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                goToSlide(index);
            });
        });
    }

    // 初始化轮播：只显示第一页，不启动自动滚动
    if (carouselSlides.length > 0) {
        carouselLinks.forEach((link, i) => {
            if (i === 0) {
                link.style.zIndex = '2';
            } else {
                link.style.zIndex = '0';
            }
        });
        // 不再调用 startCarousel()，始终停在当前页（默认第一页）
    }
});


