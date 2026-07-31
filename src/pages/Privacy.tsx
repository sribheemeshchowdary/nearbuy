import SEOHead from "@/components/SEOHead";

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Privacy Policy" description="Read Nearbuy's Privacy Policy — how we collect, use, and protect your personal data." />

    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">Privacy Policy</h1>

      <div className="prose prose-sm max-w-none space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p className="text-sm text-muted-foreground">We collect information you provide directly (name, email, phone number, business details) and automatically (usage data, device information, IP address).</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
          <p className="text-sm text-muted-foreground">We use your information to operate the platform, verify business listings, communicate with you, improve our services, and ensure platform security.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Data Sharing</h2>
          <p className="text-sm text-muted-foreground">Business listing information is publicly displayed. We do not sell personal data to third parties. We may share data with service providers who assist in operating our platform.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. Data Security</h2>
          <p className="text-sm text-muted-foreground">We implement industry-standard security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Your Rights</h2>
          <p className="text-sm text-muted-foreground">Under Singapore's Personal Data Protection Act (PDPA), you have the right to access, correct, and withdraw consent for your personal data. Contact us to exercise these rights.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Cookies</h2>
          <p className="text-sm text-muted-foreground">We use cookies and similar technologies to improve your experience. You can manage cookie preferences through your browser settings.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Contact</h2>
          <p className="text-sm text-muted-foreground">For privacy-related inquiries, contact us at hello@nearbuy.sg or through our Contact Us page.</p>
        </section>

        <p className="text-xs text-muted-foreground pt-4">Last updated: March 2026</p>
      </div>
    </div>
  </div>
);

export default Privacy;
