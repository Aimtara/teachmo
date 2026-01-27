import { useEffect, useMemo, useState } from 'react';
import { SponsorshipPartner, ReferralCode } from '@/api/entities';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import CreateSponsorshipPartnerModal from '@/components/admin/CreateSponsorshipPartnerModal';
import GenerateReferralCodeModal from '@/components/admin/GenerateReferralCodeModal';
import { ultraMinimalToast } from '@/components/shared/UltraMinimalToast';

const formatDate = (dateValue) => {
  if (!dateValue) return 'No expiration';
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return 'No expiration';
  return date.toLocaleDateString();
};

const getBenefitLabel = (partner) => {
  if (partner.benefit_type === 'full_premium') return 'Full Premium Access';
  if (partner.benefit_value) return `${partner.benefit_value}% Discount`;
  return 'Custom Benefit';
};

export default function PartnerDashboard() {
  const [partners, setPartners] = useState([]);
  const [referralCodes, setReferralCodes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [partnerModalOpen, setPartnerModalOpen] = useState(false);
  const [codeModalPartner, setCodeModalPartner] = useState(null);
  const [updatingPartnerId, setUpdatingPartnerId] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [partnersResponse, codesResponse] = await Promise.all([
        SponsorshipPartner.list(),
        ReferralCode.list(),
      ]);
      setPartners(partnersResponse || []);
      setReferralCodes(codesResponse || []);
    } catch (error) {
      console.error('Failed to load partner portal data:', error);
      setPartners([]);
      setReferralCodes([]);
      setErrorMessage('Unable to load sponsorship data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const totalPartners = partners.length;
    const activePartners = partners.filter((partner) => partner.is_active).length;
    const totalLicenses = partners.reduce(
      (sum, partner) => sum + (partner.licenses_allocated || 0),
      0
    );
    return {
      totalPartners,
      activePartners,
      totalLicenses,
      referralCodes: referralCodes.length,
    };
  }, [partners, referralCodes]);

  const partnerLookup = useMemo(
    () => new Map(partners.map((partner) => [partner.id, partner])),
    [partners]
  );

  const filteredPartners = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return partners;
    return partners.filter((partner) => {
      const fields = [partner.name, partner.contact_name, partner.contact_email]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return fields.some((value) => value.includes(query));
    });
  }, [partners, searchTerm]);

  const handleCreatePartner = async (partnerData) => {
    await SponsorshipPartner.create(partnerData);
    setPartnerModalOpen(false);
    await loadData();
  };

  const handleGenerateCode = async (codeData) => {
    await ReferralCode.create(codeData);
    setCodeModalPartner(null);
    await loadData();
  };

  const handleTogglePartner = async (partner) => {
    if (!partner?.id) return;
    const nextStatus = !partner.is_active;
    setUpdatingPartnerId(partner.id);
    try {
      await SponsorshipPartner.update(partner.id, { is_active: nextStatus });
      setPartners((prev) =>
        prev.map((item) =>
          item.id === partner.id ? { ...item, is_active: nextStatus } : item
        )
      );
    } catch (error) {
      console.error('Failed to update partner status:', error);
    } finally {
      setUpdatingPartnerId(null);
    }
  };

  const handleExportCodes = () => {
    if (!referralCodes.length) {
      ultraMinimalToast.show('No referral codes to export.');
      return;
    }

    const escapeValue = (value) => {
      if (value === null || value === undefined) return '';
      const stringValue = String(value);
      if (/[",\n]/.test(stringValue)) {
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      return stringValue;
    };

    const rows = [
      ['Code', 'Partner', 'Active', 'Redemption Limit', 'Expires', 'Redeemed Count'],
      ...referralCodes.map((code) => {
        const partner = partnerLookup.get(code.partner_id);
        return [
          code.code_string,
          partner?.name || 'Unknown',
          code.is_active ? 'Active' : 'Inactive',
          code.redemption_limit ?? 'Unlimited',
          formatDate(code.expiration_date),
          code.redeemed_count || 0,
        ];
      }),
    ];

    const csvContent = rows.map((row) => row.map(escapeValue).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const dateStamp = new Date().toISOString().split('T')[0];
    link.href = url;
    link.download = `referral-codes-${dateStamp}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">Partner Portal</h1>
        <p className="text-gray-600">
          Manage sponsorship partners, referral codes, and upcoming CRM integrations.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Total partners</p>
            <CardTitle className="text-2xl">{stats.totalPartners}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            All sponsorship organizations on file.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Active partners</p>
            <CardTitle className="text-2xl">{stats.activePartners}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Currently eligible to distribute licenses.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Licenses allocated</p>
            <CardTitle className="text-2xl">{stats.totalLicenses}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Combined licenses committed across partners.
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <p className="text-sm text-muted-foreground">Referral codes</p>
            <CardTitle className="text-2xl">{stats.referralCodes}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Active codes available for distribution.
          </CardContent>
        </Card>
      </section>

      {errorMessage && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      <Tabs defaultValue="partners" className="space-y-4">
        <TabsList>
          <TabsTrigger value="partners" className="data-[state=active]:bg-white">
            Partners
          </TabsTrigger>
          <TabsTrigger value="codes" className="data-[state=active]:bg-white">
            Referral Codes
          </TabsTrigger>
          <TabsTrigger value="leads" className="data-[state=active]:bg-white">
            Leads
          </TabsTrigger>
          <TabsTrigger value="campaigns" className="data-[state=active]:bg-white">
            Campaigns
          </TabsTrigger>
        </TabsList>

        <TabsContent value="partners">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">Sponsorship partners</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Search, activate, and issue referral codes for partners.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Search partners..."
                  className="sm:w-64"
                />
                <Button onClick={() => setPartnerModalOpen(true)}>
                  New Partner
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading partners...</p>
              ) : filteredPartners.length === 0 ? (
                <p className="text-sm text-muted-foreground">No partners match this search.</p>
              ) : (
                <div className="space-y-3">
                  {filteredPartners.map((partner) => (
                    <div
                      key={partner.id}
                      className="flex flex-col gap-4 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold">{partner.name}</h3>
                          <Badge variant={partner.is_active ? 'default' : 'secondary'}>
                            {partner.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {partner.contact_name} · {partner.contact_email}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Benefit: {getBenefitLabel(partner)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Licenses: {partner.licenses_redeemed || 0} redeemed / {partner.licenses_allocated || 0} allocated
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={Boolean(partner.is_active)}
                            onCheckedChange={() => handleTogglePartner(partner)}
                            disabled={updatingPartnerId === partner.id}
                          />
                          <span className="text-sm text-muted-foreground">
                            {partner.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => setCodeModalPartner(partner)}
                        >
                          Generate Code
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="codes">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-xl">Referral codes</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track code limits, expirations, and activation status.
                </p>
              </div>
              <Button variant="outline" onClick={handleExportCodes}>
                Export CSV
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading referral codes...</p>
              ) : referralCodes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No referral codes created yet.</p>
              ) : (
                <div className="space-y-3">
                  {referralCodes.map((code) => {
                    const partner = partnerLookup.get(code.partner_id);
                    return (
                      <div key={code.id} className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold">{code.code_string}</h3>
                            <Badge variant={code.is_active ? 'default' : 'secondary'}>
                              {code.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Partner: {partner?.name || 'Unknown'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Redemption limit: {code.redemption_limit ? `${code.redemption_limit} uses` : 'Unlimited'}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Expires: {formatDate(code.expiration_date)}
                          </p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Redeemed: {code.redeemed_count || 0}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Leads</CardTitle>
              <p className="text-sm text-muted-foreground">
                Coming soon: sync partner leads from HubSpot or CRM tools.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                We will surface lead status, owner assignments, and conversion metrics here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Campaigns</CardTitle>
              <p className="text-sm text-muted-foreground">
                Coming soon: manage outreach and referral campaigns end-to-end.
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Future integrations will track partner engagement, email performance, and activation flows.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {partnerModalOpen && (
        <CreateSponsorshipPartnerModal
          onSave={handleCreatePartner}
          onCancel={() => setPartnerModalOpen(false)}
        />
      )}

      {codeModalPartner && (
        <GenerateReferralCodeModal
          partner={codeModalPartner}
          onSave={handleGenerateCode}
          onCancel={() => setCodeModalPartner(null)}
        />
      )}
    </div>
  );
}
