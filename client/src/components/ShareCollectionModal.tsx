import React, { useState } from 'react';
import { Check, Copy, ExternalLink, Share2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { Collection } from '../types/wepay';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

interface ShareCollectionModalProps {
  collection: Collection | null;
  onClose: () => void;
}

export const ShareCollectionModal: React.FC<ShareCollectionModalProps> = ({
  collection,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!collection) return null;

  const publicPath = `/c/${collection.slug}`;
  const publicUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${publicPath}` : publicPath;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // Fallback select
      setCopied(false);
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await navigator.share({
          title: collection.title,
          text: `Contribute to "${collection.title}" on WePay`,
          url: publicUrl,
        });
      } catch {
        // User cancelled native share
      }
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && 'share' in navigator;

  return (
    <Modal
      open={Boolean(collection)}
      onClose={onClose}
      title="Share Collection Link"
      description="Contributors can pay directly via Interswitch without creating an account."
      size="sm"
    >
      <div className="space-y-5">
        <div>
          <p className="text-xs font-medium text-slate-500">Collection</p>
          <p className="text-base font-semibold text-slate-900 mt-0.5">{collection.title}</p>
        </div>

        <div className="flex flex-col items-center justify-center py-5 px-4 rounded-xl bg-slate-50 border border-slate-200">
          <div className="p-3 bg-white rounded-xl border border-slate-200">
            <QRCodeSVG
              value={publicUrl}
              size={156}
              level="M"
              bgColor="#FFFFFF"
              fgColor="#0F172A"
            />
          </div>
          <p className="text-xs text-slate-500 mt-3 text-center">
            Scan QR code to open the contributor checkout page
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-slate-600">Public Collection URL</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={publicUrl}
              aria-label="Public collection URL"
              onFocus={(e) => e.target.select()}
              className="flex-1 h-10 px-3 rounded-lg border border-slate-200 bg-slate-50 text-xs font-mono-num text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-600/20"
            />
            <Button
              variant={copied ? 'secondary' : 'primary'}
              size="md"
              onClick={handleCopy}
              className="shrink-0"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>
          </div>
          {copied && (
            <p className="text-xs text-emerald-700 font-medium" role="status">
              Collection link copied to clipboard.
            </p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-slate-200">
          {canNativeShare && (
            <Button variant="outline" fullWidth onClick={handleNativeShare}>
              <Share2 className="h-4 w-4" />
              <span>Share via Device</span>
            </Button>
          )}
          <Link to={publicPath} onClick={onClose} className="w-full">
            <Button variant="outline" fullWidth>
              <ExternalLink className="h-4 w-4" />
              <span>Open Public Page</span>
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
};
