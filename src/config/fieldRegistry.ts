export const FIELD_SECTIONS = [
  'Identité',
  'Session / programme',
  'Duplication',
  'Jalons session 1',
  'Jalons session 2',
  'Jalons session 3',
  'Jalons session 4',
  'Validation / technique',
] as const;

export type FieldSection = (typeof FIELD_SECTIONS)[number];
export type FieldType = 'text' | 'number' | 'date' | 'checkbox' | 'list';

export interface FieldDefinition {
  key: string;
  trelloName: string;
  type: FieldType;
  description: string;
  section: FieldSection;
  options?: readonly string[];
}

const SESSION_OPTIONS = ['Session 1', 'Session 2', 'Session 3', 'Session 4'] as const;
const SEASON_OPTIONS = ['Automne', 'Hiver', 'Printemps', 'Été'] as const;
const STATUS_OPTIONS = ['Brouillon', 'À valider', 'Prêt à présenter', 'Envoyé', 'Confirmé', 'Inscriptions ouvertes', 'En cours', 'Terminé', 'Annulé'] as const;
const PROGRAM_OPTIONS = ['NASA', 'Brixo', 'Robotique', 'Atomes crochus', 'Sciences dans tous les sens', 'Laboratoire en folie', 'Ingénieur Junior', 'Autre'] as const;
const GROUP_OPTIONS = ['Plus jeunes', 'Plus vieux', 'Tous', 'Groupe A', 'Groupe B', 'Autre'] as const;
const WEEKDAY_OPTIONS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'] as const;

export const FIELD_REGISTRY = [
  { key: 'sef_school_name', trelloName: 'École', type: 'text', description: "Nom de l'école.", section: 'Identité' },
  { key: 'sef_css', trelloName: 'Centre de services scolaire', type: 'text', description: 'Centre de services scolaire.', section: 'Identité' },
  { key: 'sef_school_year', trelloName: 'Année civile', type: 'text', description: 'Année civile, par exemple 2026.', section: 'Identité' },
  { key: 'sef_address', trelloName: 'Adresse', type: 'text', description: "Adresse de l'école.", section: 'Identité' },
  { key: 'sef_city', trelloName: 'Ville', type: 'text', description: "Ville de l'école.", section: 'Identité' },
  { key: 'sef_postal_code', trelloName: 'Code postal', type: 'text', description: 'Code postal.', section: 'Identité' },
  { key: 'sef_contact_name', trelloName: 'Nom contact', type: 'text', description: 'Personne contact.', section: 'Identité' },
  { key: 'sef_contact_email', trelloName: 'Courriel', type: 'text', description: 'Courriel du contact.', section: 'Identité' },
  { key: 'sef_contact_phone', trelloName: 'Numéro', type: 'text', description: 'Numéro de téléphone du contact.', section: 'Identité' },

  { key: 'sef_season', trelloName: 'Saison', type: 'list', options: SEASON_OPTIONS, description: 'Saison de la proposition.', section: 'Session / programme' },
  { key: 'sef_session_name', trelloName: 'Session', type: 'list', options: SESSION_OPTIONS, description: 'Session active pour cette carte.', section: 'Session / programme' },
  { key: 'sef_status', trelloName: 'Statut', type: 'list', options: STATUS_OPTIONS, description: 'Statut de suivi de la carte.', section: 'Session / programme' },
  { key: 'sef_program', trelloName: 'Programme', type: 'list', options: PROGRAM_OPTIONS, description: 'Programme proposé.', section: 'Session / programme' },
  { key: 'sef_group_target', trelloName: 'Groupe cible', type: 'list', options: GROUP_OPTIONS, description: 'Groupe cible de cette carte.', section: 'Session / programme' },
  { key: 'sef_grade_range', trelloName: 'Niveaux scolaires', type: 'text', description: 'Niveaux scolaires visés.', section: 'Session / programme' },
  { key: 'sef_day_of_week', trelloName: 'Journée', type: 'list', options: WEEKDAY_OPTIONS, description: 'Jour de la semaine.', section: 'Session / programme' },
  { key: 'sef_start_time', trelloName: 'Heure début', type: 'text', description: 'Heure de début.', section: 'Session / programme' },
  { key: 'sef_end_time', trelloName: 'Heure fin', type: 'text', description: 'Heure de fin.', section: 'Session / programme' },
  { key: 'sef_room', trelloName: 'Local', type: 'text', description: 'Local ou salle.', section: 'Session / programme' },
  { key: 'sef_weeks', trelloName: 'Nombre de semaines', type: 'number', description: 'Nombre de semaines de cours.', section: 'Session / programme' },
  { key: 'sef_s1_theme', trelloName: 'S1 - Thème', type: 'text', description: 'Session 1 - Thème vendu.', section: 'Session / programme' },
  { key: 'sef_s1_price', trelloName: 'S1 - Prix', type: 'number', description: 'Session 1 - Prix vendu.', section: 'Session / programme' },
  { key: 'sef_s2_theme', trelloName: 'S2 - Thème', type: 'text', description: 'Session 2 - Thème vendu.', section: 'Session / programme' },
  { key: 'sef_s2_price', trelloName: 'S2 - Prix', type: 'number', description: 'Session 2 - Prix vendu.', section: 'Session / programme' },
  { key: 'sef_s3_theme', trelloName: 'S3 - Thème', type: 'text', description: 'Session 3 - Thème vendu.', section: 'Session / programme' },
  { key: 'sef_s3_price', trelloName: 'S3 - Prix', type: 'number', description: 'Session 3 - Prix vendu.', section: 'Session / programme' },
  { key: 'sef_s4_theme', trelloName: 'S4 - Thème', type: 'text', description: 'Session 4 - Thème vendu.', section: 'Session / programme' },
  { key: 'sef_s4_price', trelloName: 'S4 - Prix', type: 'number', description: 'Session 4 - Prix vendu.', section: 'Session / programme' },

  { key: 'sef_duplicate_source', trelloName: 'Carte source copiée', type: 'text', description: "Référence de la carte d'origine.", section: 'Duplication' },
  { key: 'sef_internal_notes', trelloName: 'Notes internes', type: 'text', description: "Notes internes de l'équipe.", section: 'Duplication' },

  { key: 'sef_s1_coupon_delivery_date', trelloName: 'S1 - Livraison coupons', type: 'date', description: 'Session 1 - Livraison des coupons.', section: 'Jalons session 1' },
  { key: 'sef_s1_coupon_distribution_date', trelloName: 'S1 - Distribution coupons', type: 'date', description: 'Session 1 - Distribution des coupons.', section: 'Jalons session 1' },
  { key: 'sef_s1_registration_start_date', trelloName: 'S1 - Début inscriptions', type: 'date', description: 'Session 1 - Début des inscriptions.', section: 'Jalons session 1' },
  { key: 'sef_s1_spectacle_date', trelloName: 'S1 - Spectacle / tournée', type: 'date', description: 'Session 1 - Spectacle ou tournée de classe.', section: 'Jalons session 1' },
  { key: 'sef_s1_parent_email_1_date', trelloName: 'S1 - 1er courriel parents', type: 'date', description: 'Session 1 - Premier courriel aux parents.', section: 'Jalons session 1' },
  { key: 'sef_s1_parent_email_2_date', trelloName: 'S1 - 2e courriel parents', type: 'date', description: 'Session 1 - Deuxième courriel aux parents.', section: 'Jalons session 1' },
  { key: 'sef_s1_registration_end_date', trelloName: 'S1 - Fin inscriptions', type: 'date', description: 'Session 1 - Fin des inscriptions.', section: 'Jalons session 1' },
  { key: 'sef_s1_class_list_prep_date', trelloName: 'S1 - Préparation listes', type: 'date', description: 'Session 1 - Préparation et envoi des listes.', section: 'Jalons session 1' },
  { key: 'sef_s1_course_start_date', trelloName: 'S1 - Début des cours', type: 'date', description: 'Session 1 - Début des cours.', section: 'Jalons session 1' },
  { key: 'sef_s1_course_end_date', trelloName: 'S1 - Fin des cours', type: 'date', description: 'Session 1 - Fin des cours.', section: 'Jalons session 1' },
  { key: 'sef_s1_course_dates', trelloName: 'S1 - Dates des cours', type: 'text', description: 'Session 1 - Dates manuelles des cours, séparées par virgules.', section: 'Jalons session 1' },

  { key: 'sef_s2_coupon_delivery_date', trelloName: 'S2 - Livraison coupons', type: 'date', description: 'Session 2 - Livraison des coupons.', section: 'Jalons session 2' },
  { key: 'sef_s2_coupon_distribution_date', trelloName: 'S2 - Distribution coupons', type: 'date', description: 'Session 2 - Distribution des coupons.', section: 'Jalons session 2' },
  { key: 'sef_s2_registration_start_date', trelloName: 'S2 - Début inscriptions', type: 'date', description: 'Session 2 - Début des inscriptions.', section: 'Jalons session 2' },
  { key: 'sef_s2_spectacle_date', trelloName: 'S2 - Spectacle / tournée', type: 'date', description: 'Session 2 - Spectacle ou tournée de classe.', section: 'Jalons session 2' },
  { key: 'sef_s2_parent_email_1_date', trelloName: 'S2 - 1er courriel parents', type: 'date', description: 'Session 2 - Premier courriel aux parents.', section: 'Jalons session 2' },
  { key: 'sef_s2_parent_email_2_date', trelloName: 'S2 - 2e courriel parents', type: 'date', description: 'Session 2 - Deuxième courriel aux parents.', section: 'Jalons session 2' },
  { key: 'sef_s2_registration_end_date', trelloName: 'S2 - Fin inscriptions', type: 'date', description: 'Session 2 - Fin des inscriptions.', section: 'Jalons session 2' },
  { key: 'sef_s2_class_list_prep_date', trelloName: 'S2 - Préparation listes', type: 'date', description: 'Session 2 - Préparation et envoi des listes.', section: 'Jalons session 2' },
  { key: 'sef_s2_course_start_date', trelloName: 'S2 - Début des cours', type: 'date', description: 'Session 2 - Début des cours.', section: 'Jalons session 2' },
  { key: 'sef_s2_course_end_date', trelloName: 'S2 - Fin des cours', type: 'date', description: 'Session 2 - Fin des cours.', section: 'Jalons session 2' },
  { key: 'sef_s2_course_dates', trelloName: 'S2 - Dates des cours', type: 'text', description: 'Session 2 - Dates manuelles des cours, séparées par virgules.', section: 'Jalons session 2' },

  { key: 'sef_s3_coupon_delivery_date', trelloName: 'S3 - Livraison coupons', type: 'date', description: 'Session 3 - Livraison des coupons.', section: 'Jalons session 3' },
  { key: 'sef_s3_coupon_distribution_date', trelloName: 'S3 - Distribution coupons', type: 'date', description: 'Session 3 - Distribution des coupons.', section: 'Jalons session 3' },
  { key: 'sef_s3_registration_start_date', trelloName: 'S3 - Début inscriptions', type: 'date', description: 'Session 3 - Début des inscriptions.', section: 'Jalons session 3' },
  { key: 'sef_s3_spectacle_date', trelloName: 'S3 - Spectacle / tournée', type: 'date', description: 'Session 3 - Spectacle ou tournée de classe.', section: 'Jalons session 3' },
  { key: 'sef_s3_parent_email_1_date', trelloName: 'S3 - 1er courriel parents', type: 'date', description: 'Session 3 - Premier courriel aux parents.', section: 'Jalons session 3' },
  { key: 'sef_s3_parent_email_2_date', trelloName: 'S3 - 2e courriel parents', type: 'date', description: 'Session 3 - Deuxième courriel aux parents.', section: 'Jalons session 3' },
  { key: 'sef_s3_registration_end_date', trelloName: 'S3 - Fin inscriptions', type: 'date', description: 'Session 3 - Fin des inscriptions.', section: 'Jalons session 3' },
  { key: 'sef_s3_class_list_prep_date', trelloName: 'S3 - Préparation listes', type: 'date', description: 'Session 3 - Préparation et envoi des listes.', section: 'Jalons session 3' },
  { key: 'sef_s3_course_start_date', trelloName: 'S3 - Début des cours', type: 'date', description: 'Session 3 - Début des cours.', section: 'Jalons session 3' },
  { key: 'sef_s3_course_end_date', trelloName: 'S3 - Fin des cours', type: 'date', description: 'Session 3 - Fin des cours.', section: 'Jalons session 3' },
  { key: 'sef_s3_course_dates', trelloName: 'S3 - Dates des cours', type: 'text', description: 'Session 3 - Dates manuelles des cours, séparées par virgules.', section: 'Jalons session 3' },

  { key: 'sef_s4_coupon_delivery_date', trelloName: 'S4 - Livraison coupons', type: 'date', description: 'Session 4 - Livraison des coupons.', section: 'Jalons session 4' },
  { key: 'sef_s4_coupon_distribution_date', trelloName: 'S4 - Distribution coupons', type: 'date', description: 'Session 4 - Distribution des coupons.', section: 'Jalons session 4' },
  { key: 'sef_s4_registration_start_date', trelloName: 'S4 - Début inscriptions', type: 'date', description: 'Session 4 - Début des inscriptions.', section: 'Jalons session 4' },
  { key: 'sef_s4_spectacle_date', trelloName: 'S4 - Spectacle / tournée', type: 'date', description: 'Session 4 - Spectacle ou tournée de classe.', section: 'Jalons session 4' },
  { key: 'sef_s4_parent_email_1_date', trelloName: 'S4 - 1er courriel parents', type: 'date', description: 'Session 4 - Premier courriel aux parents.', section: 'Jalons session 4' },
  { key: 'sef_s4_parent_email_2_date', trelloName: 'S4 - 2e courriel parents', type: 'date', description: 'Session 4 - Deuxième courriel aux parents.', section: 'Jalons session 4' },
  { key: 'sef_s4_registration_end_date', trelloName: 'S4 - Fin inscriptions', type: 'date', description: 'Session 4 - Fin des inscriptions.', section: 'Jalons session 4' },
  { key: 'sef_s4_class_list_prep_date', trelloName: 'S4 - Préparation listes', type: 'date', description: 'Session 4 - Préparation et envoi des listes.', section: 'Jalons session 4' },
  { key: 'sef_s4_course_start_date', trelloName: 'S4 - Début des cours', type: 'date', description: 'Session 4 - Début des cours.', section: 'Jalons session 4' },
  { key: 'sef_s4_course_end_date', trelloName: 'S4 - Fin des cours', type: 'date', description: 'Session 4 - Fin des cours.', section: 'Jalons session 4' },
  { key: 'sef_s4_course_dates', trelloName: 'S4 - Dates des cours', type: 'text', description: 'Session 4 - Dates manuelles des cours, séparées par virgules.', section: 'Jalons session 4' },

  { key: 'sef_validation_score', trelloName: 'Score validation', type: 'number', description: 'Score de validation opérationnelle.', section: 'Validation / technique' },
  { key: 'sef_validation_status', trelloName: 'Statut validation', type: 'list', options: ['Incomplet', 'Attention', 'Prêt à présenter'], description: 'Statut de validation.', section: 'Validation / technique' },
  { key: 'sef_warnings', trelloName: 'Alertes', type: 'text', description: 'Alertes de validation.', section: 'Validation / technique' },
  { key: 'sef_last_synced_at', trelloName: 'Dernière synchro', type: 'date', description: 'Date de dernière synchronisation.', section: 'Validation / technique' },
  { key: 'sef_sync_hash', trelloName: 'Hash technique', type: 'text', description: 'Hash technique pour éviter les boucles de synchro.', section: 'Validation / technique' },
  { key: 'sef_lab_reactor_version', trelloName: 'Version Lab Reactor', type: 'text', description: 'Version du Power-Up Lab Reactor.', section: 'Validation / technique' },
  { key: 'sef_pricing_widget_url', trelloName: 'URL widget calculatrice', type: 'text', description: 'URL externe du futur widget calculatrice.', section: 'Validation / technique' },
] as const satisfies readonly FieldDefinition[];

export type FieldKey = (typeof FIELD_REGISTRY)[number]['key'];

export const FIELD_BY_KEY = Object.fromEntries(FIELD_REGISTRY.map((field) => [field.key, field])) as Record<FieldKey, FieldDefinition>;
export const FIELD_BY_TRELLO_NAME = Object.fromEntries(FIELD_REGISTRY.map((field) => [field.trelloName, field])) as Record<string, FieldDefinition>;

export const COURSE_DATE_FIELD_KEYS: readonly FieldKey[] = [
  'sef_s1_course_dates',
  'sef_s2_course_dates',
  'sef_s3_course_dates',
  'sef_s4_course_dates',
];

export const TECHNICAL_FIELD_KEYS: readonly FieldKey[] = [
  'sef_validation_score',
  'sef_validation_status',
  'sef_warnings',
  'sef_last_synced_at',
  'sef_sync_hash',
  'sef_lab_reactor_version',
];

export const VISIBLE_TRELLO_FIELD_KEYS: readonly FieldKey[] = [
  'sef_school_name',
  'sef_css',
  'sef_school_year',
  'sef_contact_name',
  'sef_contact_email',
  'sef_contact_phone',
  'sef_season',
  'sef_session_name',
  'sef_status',
  'sef_program',
  'sef_group_target',
  'sef_grade_range',
  'sef_day_of_week',
  'sef_start_time',
  'sef_end_time',
  'sef_room',
  'sef_weeks',
  'sef_s1_theme',
  'sef_s1_price',
  'sef_s2_theme',
  'sef_s2_price',
  'sef_s3_theme',
  'sef_s3_price',
  'sef_s4_theme',
  'sef_s4_price',
  'sef_validation_score',
  'sef_validation_status',
  'sef_last_synced_at',
  'sef_lab_reactor_version',
] as const;

export const VISIBLE_TRELLO_FIELD_REGISTRY = FIELD_REGISTRY.filter((field) => VISIBLE_TRELLO_FIELD_KEYS.includes(field.key as FieldKey));

export const POWER_UP_DATA_FIELD_KEYS = FIELD_REGISTRY
  .map((field) => field.key as FieldKey)
  .filter((key) => !VISIBLE_TRELLO_FIELD_KEYS.includes(key) || COURSE_DATE_FIELD_KEYS.includes(key));

export function getFieldsBySection(section: FieldSection): FieldDefinition[] {
  return FIELD_REGISTRY.filter((field) => field.section === section);
}
