import React, { useEffect, useState } from 'react';
import { BottomSheet } from './BottomSheet';

interface ShareImageSheetProps {
  isOpen: boolean;
  onClose: () => void;
  makeImage: () => Promise<Blob>;
  fileName: string;
  shareText: string;
}

export const ShareImageSheet: React.FC<ShareImageSheetProps> = ({ isOpen, onClose, makeImage, fileName, shareText }) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [url, setUrl] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    let made = '';
    setError('');
    setStatus('');
    makeImage()
      .then((b) => {
        if (cancelled) return;
        made = URL.createObjectURL(b);
        setBlob(b);
        setUrl(made);
      })
      .catch(() => !cancelled && setError("Couldn't make the image on this device. You can still share your results as text."));
    return () => {
      cancelled = true;
      if (made) URL.revokeObjectURL(made);
    };
  }, [isOpen, makeImage]);

  const file = blob ? new File([blob], fileName, { type: 'image/png' }) : null;
  const canShareFile = Boolean(file && navigator.canShare?.({ files: [file] }));

  const handleShare = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: shareText });
      setStatus('Shared.');
    } catch {
      // the player closed the share sheet; nothing to do
    }
  };

  const handleSave = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setStatus('Saved to your downloads. If nothing happened, press and hold the picture to save it.');
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Share as a picture">
      <div className="share-image-content">
        {error ? (
          <p className="setting-note">{error}</p>
        ) : url ? (
          <img className="share-image-preview" src={url} alt="Your Ballpark results card" />
        ) : (
          <div className="share-image-loading">Drawing your card...</div>
        )}
        <p className="setting-note">Great for Instagram stories. You can also press and hold the picture to save it.</p>
        <div className="share-image-actions">
          {canShareFile && (
            <button type="button" className="primary-button" onClick={handleShare}>
              Share picture
            </button>
          )}
          <button type="button" className={canShareFile ? 'secondary-button' : 'primary-button'} onClick={handleSave} disabled={!url}>
            Save picture
          </button>
        </div>
        {status && <p className="setting-note" role="status">{status}</p>}
      </div>
    </BottomSheet>
  );
};
