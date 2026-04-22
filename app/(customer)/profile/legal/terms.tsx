import React from 'react';
import { LegalScreen } from '@/components/profile/LegalScreen';

// TODO: replace with finalized legal copy
export default function TermsScreen() {
  return (
    <LegalScreen
      title="Terms of Service"
      sections={[
        {
          heading: 'Acceptance of Terms',
          paragraphs: [
            'By downloading, installing, or using the Seatly application ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.',
            'These terms apply to all users, including diners, restaurant partners, and staff accessing the platform.',
          ],
        },
        {
          heading: 'Use of the Service',
          paragraphs: [
            'Seatly grants you a limited, non-exclusive, non-transferable licence to use the app for personal, non-commercial purposes.',
            'You may not reverse engineer, decompile, or attempt to derive source code from any part of the Service.',
            'You are responsible for maintaining the confidentiality of your account credentials.',
          ],
        },
        {
          heading: 'Reservations & Cancellations',
          paragraphs: [
            'Reservations made through Seatly are subject to each restaurant\'s individual cancellation and no-show policy.',
            'Seatly is not liable for any fees charged by restaurants resulting from late cancellations or no-shows.',
          ],
        },
        {
          heading: 'Loyalty Points & Credits',
          paragraphs: [
            'Loyalty points and Cenaiva credits have no cash value and cannot be transferred or redeemed for cash.',
            'Seatly reserves the right to modify, suspend, or terminate the loyalty programme at any time with reasonable notice.',
          ],
        },
        {
          heading: 'Limitation of Liability',
          paragraphs: [
            'To the maximum extent permitted by law, Seatly is not liable for indirect, incidental, or consequential damages arising from your use of the Service.',
          ],
        },
        {
          heading: 'Changes to Terms',
          paragraphs: [
            'We may update these Terms from time to time. Continued use of the Service after changes constitutes acceptance of the revised Terms.',
            'Last updated: April 2026.',
          ],
        },
      ]}
    />
  );
}
