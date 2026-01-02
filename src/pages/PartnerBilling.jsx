import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

function PartnerBillingContent() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Billing &amp; Payouts</h1>
          <p className="text-gray-600">
            Track payout history, manage payout preferences, and review billing details
            for your partner account.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Payout settings (coming soon)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-gray-600">
            <p>
              We&apos;re preparing integrations with payment processors so you can choose
              how and when payouts are issued. You&apos;ll be able to connect bank accounts,
              see payout schedules, and download invoices here.
            </p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Configure payout schedules and payment methods.</li>
              <li>Download monthly payout statements.</li>
              <li>Review invoices and tax documentation.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function PartnerBilling() {
  return (
    <ProtectedRoute allowedRoles={['partner', 'admin', 'system_admin']} requireAuth={true}>
      <PartnerBillingContent />
    </ProtectedRoute>
  );
}
