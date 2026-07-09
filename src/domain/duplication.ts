import type { FieldKey } from '../config/fieldRegistry';
import type { LabState } from './labState';

const TECHNICAL_FIELDS: FieldKey[] = [
  'sef_duplicate_source',
  'sef_validation_score',
  'sef_validation_status',
  'sef_warnings',
  'sef_last_synced_at',
  'sef_sync_hash',
  'sef_lab_reactor_version',
];

const SESSION_DATE_FIELDS: FieldKey[] = [
  'sef_s1_coupon_delivery_date',
  'sef_s1_coupon_distribution_date',
  'sef_s1_registration_start_date',
  'sef_s1_spectacle_date',
  'sef_s1_parent_email_1_date',
  'sef_s1_parent_email_2_date',
  'sef_s1_registration_end_date',
  'sef_s1_class_list_prep_date',
  'sef_s1_course_start_date',
  'sef_s1_course_end_date',
  'sef_s2_coupon_delivery_date',
  'sef_s2_coupon_distribution_date',
  'sef_s2_registration_start_date',
  'sef_s2_spectacle_date',
  'sef_s2_parent_email_1_date',
  'sef_s2_parent_email_2_date',
  'sef_s2_registration_end_date',
  'sef_s2_class_list_prep_date',
  'sef_s2_course_start_date',
  'sef_s2_course_end_date',
  'sef_s3_coupon_delivery_date',
  'sef_s3_coupon_distribution_date',
  'sef_s3_registration_start_date',
  'sef_s3_spectacle_date',
  'sef_s3_parent_email_1_date',
  'sef_s3_parent_email_2_date',
  'sef_s3_registration_end_date',
  'sef_s3_class_list_prep_date',
  'sef_s3_course_start_date',
  'sef_s3_course_end_date',
];

export function cleanAfterDuplication(state: LabState, options: { clearDates?: boolean } = {}): LabState {
  const next = { ...state };
  for (const key of TECHNICAL_FIELDS) next[key] = null;
  if (options.clearDates) {
    for (const key of SESSION_DATE_FIELDS) next[key] = null;
  }
  next.sef_status = 'À valider';
  next.sef_validation_status = 'Incomplet';
  next.sef_warnings = null;
  return next;
}
