/**
 * Site Officiel MOUSSA-GROS — Famille MOUSSA-GROS
 * Logique applicative : Routeur SPA, Timeline biographique, Filtres archives,
 * Livre d'or & Archives (données chargées depuis db.json), Formulaires, Scroll Fade-In
 *
 * NOTE IMPORTANTE SUR LA PERSISTANCE :
 * Ce site est une application statique (HTML/CSS/JS) exécutée entièrement
 * dans le navigateur. Un navigateur ne peut pas écrire directement dans le
 * fichier db.json situé sur le serveur (cela nécessiterait un backend/API).
 * Le fichier db.json sert donc de source de données initiale (données
 * "mock") pour les archives, les filtres et les témoignages existants.
 * Les nouveaux témoignages soumis via le formulaire sont conservés dans le
 * navigateur du visiteur (localStorage) et fusionnés à l'affichage avec les
 * données de db.json, afin que la démonstration reste fonctionnelle sans
 * serveur. Pour une persistance réelle et partagée entre tous les
 * visiteurs, il faudrait brancher un petit backend (API + base de données)
 * qui écrirait dans db.json ou dans une vraie base de données.
 */

document.addEventListener('DOMContentLoaded', () => {
    // ----------------------------------------------------
    // 0. Chargement des données (db.json)
    // ----------------------------------------------------
    let siteData = {
        livret: null,
        archives: [],
        testimonials: []
    };

    const DATA_URL = '/api/data';

    function loadSiteData() {
        return fetch(DATA_URL)
            .then((res) => {
                if (!res.ok) throw new Error('Impossible de charger les données du site.');
                return res.json();
            })
            .then((data) => {
                siteData = {
                    livret: data.livret || null,
                    archives: Array.isArray(data.archives) ? data.archives : [],
                    testimonials: Array.isArray(data.testimonials) ? data.testimonials : []
                };
            })
            .catch((err) => {
                console.error('Erreur de chargement de db.json :', err);
            });
    }


    // ----------------------------------------------------
    // 1. SPA Router
    // ----------------------------------------------------
    const routes = {
        '': 'accueil',
        '#/': 'accueil',
        '#/accueil': 'accueil',
        '#/biographie': 'biographie',
        '#/oeuvres': 'oeuvres',
        '#/valeurs': 'valeurs',
        '#/rue-elhadj-moussa-gros-ibrahim': 'rue',
        '#/archives': 'archives',
        '#/famille-windiberi': 'famille'
    };

    function navigate() {
        const hash = window.location.hash || '#/accueil';
        const pageId = routes[hash] || 'accueil';

        // Update pages visibility
        document.querySelectorAll('.page-section').forEach(section => {
            section.classList.remove('active');
        });

        const activeSection = document.getElementById(pageId);
        if (activeSection) {
            activeSection.classList.add('active');
        }

        // Update nav links active class
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === hash) {
                link.classList.add('active');
            }
        });

        // Update mobile drawer active class
        document.querySelectorAll('.mobile-nav-link').forEach(link => {
            link.classList.remove('text-or-sombre', 'font-semibold');
            link.style.color = '';
            if (link.getAttribute('href') === hash) {
                link.style.color = 'var(--or-sombre)';
                link.classList.add('font-semibold');
            }
        });

        // Close mobile drawer on navigation
        closeMobileMenu();

        // Scroll to top
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    window.addEventListener('hashchange', navigate);
    window.addEventListener('load', navigate);


    // ----------------------------------------------------
    // 2. Mobile Navigation Drawer
    // ----------------------------------------------------
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileCloseBtn = document.getElementById('mobile-close-btn');
    const mobileDrawer = document.getElementById('mobile-drawer');
    const drawerOverlay = document.getElementById('drawer-overlay');

    function openMobileMenu() {
        mobileDrawer.classList.remove('translate-x-full');
        drawerOverlay.classList.remove('hidden');
        document.body.classList.add('overflow-hidden');
    }

    function closeMobileMenu() {
        mobileDrawer.classList.add('translate-x-full');
        drawerOverlay.classList.add('hidden');
        document.body.classList.remove('overflow-hidden');
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileMenu);
    if (mobileCloseBtn) mobileCloseBtn.addEventListener('click', closeMobileMenu);
    if (drawerOverlay) drawerOverlay.addEventListener('click', closeMobileMenu);


    // ----------------------------------------------------
    // 3. Biography Page: Interactive Timeline & Content Swapping
    // ----------------------------------------------------
    const timelineNavItems = document.querySelectorAll('.timeline-nav-item');
    const timelineCards = document.querySelectorAll('.timeline-card');

    timelineNavItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-timeline');

            // Update nav state
            timelineNavItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');

            // Hide/Show Timeline cards with nice fade effect
            timelineCards.forEach(card => {
                card.classList.add('hidden', 'opacity-0');
                if (card.id === `timeline-${targetId}` || targetId === 'all') {
                    card.classList.remove('hidden');
                    setTimeout(() => {
                        card.classList.remove('opacity-0');
                    }, 50);
                }
            });
        });
    });


    // ----------------------------------------------------
    // 4. Archives Page: Rendu dynamique + Filtrage (Photos / Documents)
    //    Les archives et leurs catégories proviennent de db.json
    // ----------------------------------------------------
    const archivesGrid = document.getElementById('archives-grid');
    let currentArchiveFilter = 'photos';

    function pdfIconSvg() {
        return `
            <div class="w-10 h-10 rounded bg-red-50 border border-red-200 flex items-center justify-center text-red-500 mb-4">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
                </svg>
            </div>
        `;
    }

    function renderArchiveCard(item) {
        const wrapper = document.createElement('div');
        wrapper.className = 'archive-item scroll-reveal visible carte-patrimoine overflow-hidden';
        wrapper.setAttribute('data-category', item.category);

        if (item.type === 'image') {
            const colorClass = (item.is_color || item.color || item.is_couleur) ? 'photo-couleur' : '';
            const isPortrait = item.portrait === true;
            const containerH = isPortrait ? 'h-80' : 'h-64';
            const objFit = isPortrait ? 'object-contain object-right' : 'object-cover object-top';
            wrapper.innerHTML = `
                <div class="${containerH} overflow-hidden bg-nuit flex items-center justify-center">
                    <img src="${item.src}" alt="${item.alt || item.title || ''}"
                        class="photo-patrimoine ${colorClass} w-full h-full ${objFit} cursor-zoom-in" />
                </div>
                <div class="p-5 border-t border-nuit/08">
                    <span class="badge-or">${item.badge || 'Photographie'}</span>
                    <h4 class="font-titre font-bold text-nuit mt-2">${item.title || ''}</h4>
                    <p class="font-corps text-xs text-nuit/50 mt-1">${item.caption || ''}</p>
                </div>
            `;
        } else {
            const sizeLabel = item.taille_lisible ? ` (${item.taille_lisible})` : '';
            wrapper.classList.add('p-8', 'flex', 'flex-col', 'justify-between', 'min-h-[260px]');
            wrapper.innerHTML = `
                <div>
                    ${pdfIconSvg()}
                    <span class="badge-or mb-3 inline-block">${item.badge || 'Document PDF'}</span>
                    <h4 class="font-titre font-bold text-nuit text-lg mb-2">${item.title || ''}</h4>
                    <p class="font-corps text-xs text-nuit/60 leading-relaxed">${item.description || ''}</p>
                </div>
                <button type="button" data-pdf-download data-pdf-title="${(item.title || 'Document').replace(/"/g, '&quot;')}" data-pdf-fichier="${item.fichier || ''}" data-pdf-size="${item.taille_lisible || ''}"
                    class="btn-contour mt-6 flex items-center justify-center gap-2 px-4 py-2.5 rounded text-xs text-center">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Télécharger (PDF${sizeLabel})
                </button>
            `;
        }
        return wrapper;
    }

    function renderArchives() {
        if (!archivesGrid) return;
        archivesGrid.innerHTML = '';

        const items = siteData.archives.filter((item) => {
            return currentArchiveFilter === 'all' || item.category === currentArchiveFilter;
        });

        items.forEach((item) => {
            archivesGrid.appendChild(renderArchiveCard(item));
        });

        // Bind download buttons rendered dynamically
        archivesGrid.querySelectorAll('[data-pdf-download]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const title = btn.getAttribute('data-pdf-title') || 'Document';
                const fichier = btn.getAttribute('data-pdf-fichier');
                if (!fichier) {
                    alert('Fichier introuvable.');
                    return;
                }
                try {
                    const response = await fetch(fichier);
                    if (!response.ok) throw new Error('Fichier non accessible.');
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = fichier.split('/').pop();
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch (err) {
                    alert(`Erreur lors du téléchargement : ${err.message}`);
                }
            });
        });
    }

    const archiveFilters = document.querySelectorAll('.filtre-archives');
    archiveFilters.forEach(filter => {
        filter.addEventListener('click', () => {
            const category = filter.getAttribute('data-filter');
            currentArchiveFilter = category;

            // Update filter buttons style
            archiveFilters.forEach(f => f.classList.remove('actif'));
            filter.classList.add('actif');

            renderArchives();
        });
    });


    // ----------------------------------------------------
    // 5. Archives & Testimonials: Livre d'or
    //    Base : db.json  |  Ajouts visiteurs : localStorage (voir note en tête de fichier)
    // ----------------------------------------------------
    const testimonialForm = document.getElementById('testimonial-form');
    const testimonialsContainer = document.getElementById('testimonials-list');

    function getStoredTestimonials() {
        return JSON.parse(localStorage.getItem('windiberi_testimonials')) || [];
    }

    // Carousel state — 2 rangées indépendantes
    let carouselTimers = []; // stocke tous les setInterval/setTimeout actifs

    function clearCarousels() {
        carouselTimers.forEach(id => { try { clearInterval(id); clearTimeout(id); } catch(_){} });
        carouselTimers = [];
    }

    function buildTestimonialCard(t) {
        const card = document.createElement('div');
        card.className = 'carte-temoignage';
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div>
                    <h4 class="font-titre font-bold text-nuit text-sm">${t.name}</h4>
                    <p class="font-corps text-xs mt-0.5" style="color:var(--or-sombre);">${t.relation}</p>
                </div>
                <span class="font-corps text-[10px] uppercase tracking-widest px-2 py-1 rounded" style="color:var(--bleu-nuit); background:var(--or-10); border:1px solid var(--or-25);">${t.date}</span>
            </div>
            <p class="font-corps italic text-sm leading-relaxed" style="color:var(--bleu-nuit); opacity:0.7;">
                « ${t.content} »
            </p>
        `;
        return card;
    }

    /**
     * Crée une rangée carousel horizontale pour un tableau d'items.
     * Chaque "slide" affiche 2 items côte à côte.
     * @param {Array}  items       - témoignages à afficher dans cette rangée
     * @param {number} startDelay  - délai (ms) avant le premier défilement automatique
     */
    function buildRowCarousel(items, startDelay) {
        const n = items.length;

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'overflow:hidden; position:relative; cursor:default;';

        const track = document.createElement('div');
        track.style.cssText = [
            'display:flex;',
            'transition:transform 0.6s cubic-bezier(0.4,0,0.2,1);',
            'will-change:transform;'
        ].join('');

        // Construire les slides : 2 cartes par slide
        const slideCount = Math.ceil(n / 2);
        for (let i = 0; i < slideCount; i++) {
            const slide = document.createElement('div');
            slide.style.cssText = [
                'min-width:100%;',
                'display:grid;',
                'grid-template-columns:1fr 1fr;',
                'gap:1.5rem;',
                'box-sizing:border-box;'
            ].join('');
            const a = items[i * 2];
            const b = items[i * 2 + 1];
            slide.appendChild(buildTestimonialCard(a));
            if (b) slide.appendChild(buildTestimonialCard(b));
            track.appendChild(slide);
        }
        wrapper.appendChild(track);

        // Auto-scroll seulement si > 1 slide
        if (slideCount > 1) {
            let currentSlide = 0;
            let intervalId   = null;
            let isPaused     = false;

            const advance = () => {
                currentSlide = (currentSlide + 1) % slideCount;
                track.style.transform = 'translateX(-' + (currentSlide * 100) + '%)';
            };

            const startInterval = () => {
                if (intervalId) clearInterval(intervalId);
                intervalId = setInterval(advance, 2500);
                carouselTimers.push(intervalId);
            };

            const stopInterval = () => {
                if (intervalId) {
                    clearInterval(intervalId);
                    intervalId = null;
                }
            };

            // Délai initial avant le premier défilement
            const timeoutId = setTimeout(() => {
                if (!isPaused) {
                    advance();
                    startInterval();
                }
            }, startDelay);
            carouselTimers.push(timeoutId);

            // Pause au hover — permet au visiteur de lire
            wrapper.addEventListener('mouseenter', () => {
                isPaused = true;
                stopInterval();
            });

            wrapper.addEventListener('mouseleave', () => {
                isPaused = false;
                startInterval();
            });

            // Accessibilité — pause au focus clavier
            wrapper.addEventListener('focusin', () => {
                isPaused = true;
                stopInterval();
            });

            wrapper.addEventListener('focusout', () => {
                isPaused = false;
                startInterval();
            });
        }

        return wrapper;
    }

    function renderTestimonials() {
        if (!testimonialsContainer) return;

        clearCarousels();
        testimonialsContainer.innerHTML = '';

        // Uniquement les témoignages validés
        const valid = siteData.testimonials.filter(t => t.is_valid === true);

        if (valid.length === 0) {
            testimonialsContainer.innerHTML = `
                <div class="text-center py-10">
                    <p class="font-corps text-sm" style="color:var(--bleu-nuit); opacity:0.45;">
                        Aucun témoignage validé pour le moment.
                    </p>
                </div>`;
            return;
        }

        // Répartition : items pairs → rangée 1 | items impairs → rangée 2
        const row1Items = valid.filter((_, i) => i % 2 === 0);
        const row2Items = valid.filter((_, i) => i % 2 === 1);

        const container = document.createElement('div');
        container.style.cssText = 'display:flex; flex-direction:column; gap:1.5rem;';

        // Rangée 1 — premier défilement après 2.5s
        const row1 = buildRowCarousel(row1Items, 2500);
        container.appendChild(row1);

        // Rangée 2 — décalée de 1.25s pour un défilement asynchrone
        if (row2Items.length > 0) {
            const row2 = buildRowCarousel(row2Items, 3750);
            container.appendChild(row2);
        }

        testimonialsContainer.appendChild(container);
    }

    if (testimonialForm) {
        testimonialForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const nameInput = document.getElementById('test-name');
            const relationInput = document.getElementById('test-relation');
            const contentInput = document.getElementById('test-content');

            if (!nameInput.value.trim() || !contentInput.value.trim()) {
                alert('Veuillez remplir les champs obligatoires (Nom et Message).');
                return;
            }

            const newT = {
                id: `temoin-${Date.now()}`,
                name: nameInput.value.trim(),
                relation: relationInput.value.trim() || 'Visiteur du site',
                date: new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }),
                content: contentInput.value.trim(),
                is_valid: false
            };

            // Sauvegarde dans db.json via l'API serveur
            let savedToServer = false;
            try {
                const res = await fetch('/api/testimonials', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newT)
                });
                if (res.ok) savedToServer = true;
            } catch (_) {
                // Serveur non disponible — fallback localStorage
            }

            if (!savedToServer) {
                // Fallback : conserver côté navigateur si pas de serveur
                const stored = getStoredTestimonials();
                stored.unshift(newT);
                localStorage.setItem('windiberi_testimonials', JSON.stringify(stored));
            } else {
                // Mettre à jour siteData pour affichage immédiat
                siteData.testimonials.unshift(newT);
            }

            // Reset form
            testimonialForm.reset();

            // Re-render testimonials list
            renderTestimonials();

            // Show success message
            const successMsg = document.getElementById('testimonial-success');
            if (successMsg) {
                successMsg.classList.remove('hidden');
                setTimeout(() => {
                    successMsg.classList.add('hidden');
                }, 5000);
            }
        });
    }


    // ----------------------------------------------------
    // 6. Contact Form Submission Handling
    // ----------------------------------------------------
    const contactForm = document.getElementById('contact-form');
    const contactSuccess = document.getElementById('contact-success');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('contact-name').value.trim();
            const email = document.getElementById('contact-email').value.trim();
            const subject = document.getElementById('contact-subject').value.trim();
            const message = document.getElementById('contact-message').value.trim();

            if (!name || !email || !message) {
                alert("Veuillez remplir tous les champs obligatoires (Nom, Email et Message).");
                return;
            }

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerHTML : '';

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
                submitBtn.innerHTML = 'Envoi en cours...';
            }

            try {
                const response = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, email, subject, message })
                });

                if (!response.ok) {
                    throw new Error('Erreur lors de l\'envoi du message.');
                }

                // Reset Form
                contactForm.reset();

                // Show Success Notification
                if (contactSuccess) {
                    contactSuccess.classList.remove('hidden');
                    contactSuccess.classList.add('animate-fade-in');
                    setTimeout(() => {
                        contactSuccess.classList.add('hidden');
                    }, 2000);
                }
            } catch (err) {
                alert('Erreur lors de l\'envoi : ' + err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
                    submitBtn.innerHTML = originalBtnText;
                }
            }
        });
    }


    // ----------------------------------------------------
    // 7. Bouton "Lire le livret" (header + tiroir mobile)
    //    Données du livret (fichier, taille ~32 Mo) chargées depuis db.json
    // ----------------------------------------------------
    function handleLivretClick() {
        const livret = siteData.livret;
        if (!livret || !livret.fichier) {
            alert('Fichier introuvable.');
            return;
        }
        const a = document.createElement('a');
        a.href = livret.fichier;
        a.download = livret.fichier.split('/').pop();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }

    document.querySelectorAll('[data-livret-trigger]').forEach((btn) => {
        btn.addEventListener('click', handleLivretClick);
    });


    // ----------------------------------------------------
    // 8. Scroll Fade-In — IntersectionObserver
    // ----------------------------------------------------
    function observeScrollReveal(elements) {
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver(
                (entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            entry.target.classList.add('visible');
                            observer.unobserve(entry.target);
                        }
                    });
                },
                {
                    threshold: 0.12,
                    rootMargin: '0px 0px -40px 0px'
                }
            );
            elements.forEach(el => observer.observe(el));
        } else {
            elements.forEach(el => el.classList.add('visible'));
        }
    }

    observeScrollReveal(document.querySelectorAll('.scroll-reveal'));

    window.addEventListener('hashchange', () => {
        setTimeout(() => {
            const activeSection = document.querySelector('.page-section.active');
            if (activeSection) {
                const els = activeSection.querySelectorAll('.scroll-reveal:not(.visible)');
                observeScrollReveal(els);
            }
        }, 80);
    });


    // ----------------------------------------------------
    // 9. Initialisation : charger db.json puis rendre l'UI dépendante
    // ----------------------------------------------------
    loadSiteData().then(() => {
        renderArchives();
        renderTestimonials();
        observeScrollReveal(document.querySelectorAll('#archives .scroll-reveal:not(.visible)'));
    });
});