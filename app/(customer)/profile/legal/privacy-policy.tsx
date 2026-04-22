import React from 'react';
import { LegalScreen } from '@/components/profile/LegalScreen';

// TODO: replace with finalized legal copy
export default function PrivacyPolicyScreen() {
  return (
    <LegalScreen
      title="Privacy Policy"
      sections={[
        {
          heading: 'Information We Collect',
          paragraphs: [
            'We collect information you provide directly: name, email, phone number, and payment details when you create an account or make a booking.',
            'We automatically collect usage data such as screens visited, bookings made, and device information to improve the Service.',
          ],
        },
        {
          heading: 'How We Use Your Information',
          paragraphs: [
            'To process reservations and send booking confirmations and reminders.',
            'To personalise restaurant recommendations based on your dining history and stated preferences.',
            'To administer the loyalty programme and apply earned credits.',
            'To communicate service updates, promotions, and support responses.',
          ],
        },
        {
          heading: 'Sharing Your Information',
          paragraphs: [
            'We share reservation details with the restaurant you are booking — name, party size, and any special requests.',
            'We do not sell your personal information to third parties.',
            'We may share data with service providers (payment processors, analytics) under strict data-processing agreements.',
          ],
        },
        {
          heading: 'Data Retention',
          paragraphs: [
            'We retain your account data for as long as your account is active, or as required by law.',
            'You may request deletion of your account and associated data at any time via Profile → Privacy → Delete Account.',
          ],
        },
        {
          heading: 'Your Rights',
          paragraphs: [
            'You have the right to access, correct, or delete your personal data. Contact privacy@seatly.com with any requests.',
            'Users in the EEA and UK also have the right to data portability and to object to processing.',
          ],
        },
        {
          heading: 'Contact',
          paragraphs: [
            'Privacy questions? Reach us at privacy@seatly.com.',
            'Last updated: April 2026.',
          ],
        },
      ]}
    />
  );
}
