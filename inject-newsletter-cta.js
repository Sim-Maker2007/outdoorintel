const fs = require('fs');
const path = require('path');

function findBlogHtml(dir) {
    const results = [];
    for (const item of fs.readdirSync(dir)) {
        if (item === '.git' || item === 'node_modules') continue;
        const full = path.join(dir, item);
        if (fs.statSync(full).isDirectory()) {
            results.push(...findBlogHtml(full));
        } else if (item.endsWith('.html') && full.includes('/blog/')) {
            results.push(full);
        }
    }
    return results;
}

const NEWSLETTER_CTA_EN = `
        <!-- Newsletter CTA — Mailchimp: replace YOUR_MAILCHIMP_FORM_ACTION_URL with your audience form action URL -->
        <section class="bg-[#2d5a3d] py-12 px-6 text-white text-center">
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold mb-2">Get Weekly Outdoor Intel</h2>
                <p class="text-white/80 mb-6">Seasonal tactics, gear that works, and new spots — straight to your inbox every Thursday.</p>
                <form class="newsletter-cta-form flex flex-col sm:flex-row gap-3 max-w-md mx-auto" action="YOUR_MAILCHIMP_FORM_ACTION_URL" method="POST" target="_blank">
                    <input type="email" name="EMAIL" required placeholder="Your email" autocomplete="email" class="flex-1 px-4 py-3 rounded-lg text-[#3e3127] bg-white placeholder-[#6b6359] text-sm focus:outline-none focus:ring-2 focus:ring-[#c97c5e]">
                    <div style="position:absolute;left:-5000px" aria-hidden="true"><input type="text" name="b_mailchimp_honeypot" tabindex="-1" value=""></div>
                    <button type="submit" class="px-6 py-3 bg-[#c97c5e] text-white text-sm font-semibold rounded-lg hover:bg-white hover:text-[#2d5a3d] transition-colors whitespace-nowrap">Subscribe</button>
                </form>
                <p class="text-white/40 text-xs mt-3">Free forever. No spam. Unsubscribe anytime.</p>
            </div>
        </section>
`;

const NEWSLETTER_CTA_FR = `
        <!-- Infolettre CTA — Mailchimp: remplacer YOUR_MAILCHIMP_FORM_ACTION_URL avec votre URL Mailchimp -->
        <section class="bg-[#2d5a3d] py-12 px-6 text-white text-center">
            <div class="max-w-2xl mx-auto">
                <h2 class="text-2xl font-bold mb-2">Intel plein air chaque semaine</h2>
                <p class="text-white/80 mb-6">Tactiques saisonni\u00e8res, \u00e9quipement test\u00e9 et nouveaux spots \u2014 dans votre bo\u00eete chaque jeudi.</p>
                <form class="newsletter-cta-form flex flex-col sm:flex-row gap-3 max-w-md mx-auto" action="YOUR_MAILCHIMP_FORM_ACTION_URL" method="POST" target="_blank">
                    <input type="email" name="EMAIL" required placeholder="Votre courriel" autocomplete="email" class="flex-1 px-4 py-3 rounded-lg text-[#3e3127] bg-white placeholder-[#6b6359] text-sm focus:outline-none focus:ring-2 focus:ring-[#c97c5e]">
                    <div style="position:absolute;left:-5000px" aria-hidden="true"><input type="text" name="b_mailchimp_honeypot" tabindex="-1" value=""></div>
                    <button type="submit" class="px-6 py-3 bg-[#c97c5e] text-white text-sm font-semibold rounded-lg hover:bg-white hover:text-[#2d5a3d] transition-colors whitespace-nowrap">S'abonner</button>
                </form>
                <p class="text-white/40 text-xs mt-3">Gratuit. Aucun spam. D\u00e9sabonnement en un clic.</p>
            </div>
        </section>
`;

const files = findBlogHtml('.');
let updated = 0;

files.forEach(f => {
    let html = fs.readFileSync(f, 'utf8');
    if (html.includes('newsletter-cta-form')) return; // already injected

    const isFrench = f.includes('/fr/') || f.startsWith('fr/');
    const cta = isFrench ? NEWSLETTER_CTA_FR : NEWSLETTER_CTA_EN;

    // Insert newsletter CTA right before </main>
    if (html.includes('</main>')) {
        html = html.replace('    </main>', cta + '    </main>');
        fs.writeFileSync(f, html);
        updated++;
    }
});

console.log(`Newsletter CTA injected into ${updated} blog posts.`);
