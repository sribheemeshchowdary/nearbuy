import SEOHead from "@/components/SEOHead";

const Terms = () => (
  <div className="min-h-screen bg-background">
    <SEOHead title="Terms of Service" description="Read the Terms of Service for Nearbuy — Singapore's trusted business directory." />

    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <h1 className="text-3xl font-bold text-foreground mb-8">Terms of Service</h1>

      <div className="prose prose-sm max-w-none space-y-6">
        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p className="text-sm text-muted-foreground">By accessing and using Nearbuy, you agree to be bound by these Terms of Service. If you do not agree, please do not use our platform.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">2. Use of Service</h2>
          <p className="text-sm text-muted-foreground">Nearbuy provides a business directory platform for discovering and listing local businesses in Singapore. Users must provide accurate information and comply with all applicable laws.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">3. Business Listings</h2>
          <p className="text-sm text-muted-foreground">Business owners are responsible for the accuracy of their listings. All listings are subject to verification and approval. We reserve the right to remove listings that violate our guidelines.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">4. User Accounts</h2>
          <p className="text-sm text-muted-foreground">Users are responsible for maintaining the confidentiality of their account credentials. You must notify us immediately of any unauthorized use of your account.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">5. Reviews & Content</h2>
          <p className="text-sm text-muted-foreground">Users may submit reviews and content. You retain ownership of your content but grant Nearbuy a license to display it on the platform. Content must be truthful, non-defamatory, and comply with Singapore law.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">6. Limitation of Liability</h2>
          <p className="text-sm text-muted-foreground">Nearbuy is provided "as is" without warranties. We are not liable for any damages arising from the use of our platform or reliance on listed business information.</p>
        </section>

        <section className="bg-card border border-border rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-foreground">7. Changes to Terms</h2>
          <p className="text-sm text-muted-foreground">We may update these terms at any time. Continued use of the platform after changes constitutes acceptance of the new terms.</p>
        </section>

        <p className="text-xs text-muted-foreground pt-4">Last updated: March 2026</p>
      </div>
    </div>
  </div>
);

export default Terms;
