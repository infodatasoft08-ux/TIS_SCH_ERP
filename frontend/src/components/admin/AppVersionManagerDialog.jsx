import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Smartphone, Loader2, Save } from "lucide-react";
import API from '@/api';
import { toast } from 'sonner';

export default function AppVersionManagerDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [versionData, setVersionData] = useState({
    id: null,
    platform: 'android',
    latest_version: '',
    minimum_supported_version: '',
    force_update: false,
    play_store_url: '',
    release_notes: ''
  });

  const fetchVersion = async () => {
    setLoading(true);
    try {
      const response = await API.get('/app-version');
      if (response.data.success && response.data.data.length > 0) {
        const androidVersion = response.data.data.find(v => v.platform === 'android');
        if (androidVersion) {
          setVersionData({
            id: androidVersion.id,
            platform: androidVersion.platform,
            latest_version: androidVersion.latest_version,
            minimum_supported_version: androidVersion.minimum_supported_version,
            force_update: Boolean(androidVersion.force_update),
            play_store_url: androidVersion.play_store_url || '',
            release_notes: androidVersion.release_notes || ''
          });
        }
      }
    } catch (error) {
      console.error('Failed to fetch app versions:', error);
      toast.error('Failed to load mobile app version settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchVersion();
    }
  }, [open]);

  const handleSave = async () => {
    if (!versionData.latest_version || !versionData.minimum_supported_version || !versionData.play_store_url) {
      toast.error('Please fill in all required fields.');
      return;
    }

    setSaving(true);
    try {
      if (versionData.id) {
        await API.put(`/app-version/${versionData.id}`, {
          latest_version: versionData.latest_version,
          minimum_supported_version: versionData.minimum_supported_version,
          force_update: versionData.force_update,
          play_store_url: versionData.play_store_url,
          release_notes: versionData.release_notes
        });
        toast.success('App version settings updated successfully.');
        setOpen(false);
      } else {
        toast.error('Version record missing. Cannot update.');
      }
    } catch (error) {
      console.error('Update failed:', error);
      toast.error(error.response?.data?.message || 'Failed to update app version settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Smartphone className="h-4 w-4" />
          Manage Version
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Mobile App Version Settings</DialogTitle>
          <DialogDescription>
            Configure update policies and version numbers for the mobile application.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid gap-6 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latest_version">Latest Version <span className="text-red-500">*</span></Label>
                <Input
                  id="latest_version"
                  placeholder="e.g. 1.0.5"
                  value={versionData.latest_version}
                  onChange={(e) => setVersionData({ ...versionData, latest_version: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_version">Min Supported <span className="text-red-500">*</span></Label>
                <Input
                  id="min_version"
                  placeholder="e.g. 1.0.0"
                  value={versionData.minimum_supported_version}
                  onChange={(e) => setVersionData({ ...versionData, minimum_supported_version: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-lg border p-4 shadow-sm">
              <div className="space-y-0.5">
                <Label className="text-base font-semibold">Force Update</Label>
                <p className="text-sm text-muted-foreground">
                  Require all users to update to the latest version immediately.
                </p>
              </div>
              <Switch
                checked={versionData.force_update}
                onCheckedChange={(checked) => setVersionData({ ...versionData, force_update: checked })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="play_store_url">Play Store URL <span className="text-red-500">*</span></Label>
              <Input
                id="play_store_url"
                placeholder="https://play.google.com/store/apps/details?id=..."
                value={versionData.play_store_url}
                onChange={(e) => setVersionData({ ...versionData, play_store_url: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="release_notes">Release Notes</Label>
              <Textarea
                id="release_notes"
                placeholder="What's new in this version?"
                className="min-h-[100px]"
                value={versionData.release_notes}
                onChange={(e) => setVersionData({ ...versionData, release_notes: e.target.value })}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
