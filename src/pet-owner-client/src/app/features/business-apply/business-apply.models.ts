export interface BusinessCategoryCard {
  id: string;
  emoji: string;
  titleKey: string;
  descKey: string;
}

export const BUSINESS_CATEGORY_CARDS: BusinessCategoryCard[] = [
  {
    id: 'vet',
    emoji: '🩺',
    titleKey: 'BUSINESS_APPLY.CATEGORY_VET_TITLE',
    descKey: 'BUSINESS_APPLY.CATEGORY_VET_DESC',
  },
  {
    id: 'shop',
    emoji: '🛒',
    titleKey: 'BUSINESS_APPLY.CATEGORY_SHOP_TITLE',
    descKey: 'BUSINESS_APPLY.CATEGORY_SHOP_DESC',
  },
  {
    id: 'insurance',
    emoji: '🛡️',
    titleKey: 'BUSINESS_APPLY.CATEGORY_INSURANCE_TITLE',
    descKey: 'BUSINESS_APPLY.CATEGORY_INSURANCE_DESC',
  },
  {
    id: 'pension',
    emoji: '🏠',
    titleKey: 'BUSINESS_APPLY.CATEGORY_PENSION_TITLE',
    descKey: 'BUSINESS_APPLY.CATEGORY_PENSION_DESC',
  },
];
