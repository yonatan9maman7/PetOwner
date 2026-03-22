import { Pipe, PipeTransform } from '@angular/core';
import { ServiceType, PricingUnit } from '../features/wizard/wizard.model';

const SERVICE_TYPE_FROM_INDEX: Record<number, ServiceType> = {
  0: 'DogWalking',
  1: 'PetSitting',
  2: 'Boarding',
  3: 'DropInVisit',
};

const PRICING_UNIT_FROM_INDEX: Record<number, PricingUnit> = {
  0: 'PerHour',
  1: 'PerNight',
  2: 'PerVisit',
};

const SERVICE_TYPE_I18N: Record<ServiceType, string> = {
  DogWalking: 'WIZARD.SERVICE_DOG_WALKING_TITLE',
  PetSitting: 'WIZARD.SERVICE_PET_SITTING_TITLE',
  Boarding: 'WIZARD.SERVICE_BOARDING_TITLE',
  DropInVisit: 'WIZARD.SERVICE_DROP_IN_TITLE',
};

const PRICING_UNIT_I18N: Record<PricingUnit, string> = {
  PerHour: 'BOOKING.UNIT_HR',
  PerNight: 'BOOKING.UNIT_NIGHT',
  PerVisit: 'BOOKING.UNIT_VISIT',
};

export function normalizeServiceType(value: ServiceType | number | string): ServiceType {
  if (typeof value === 'number') {
    return SERVICE_TYPE_FROM_INDEX[value] ?? (String(value) as ServiceType);
  }
  const n = Number(value);
  if (!isNaN(n) && SERVICE_TYPE_FROM_INDEX[n] !== undefined) {
    return SERVICE_TYPE_FROM_INDEX[n];
  }
  return value as ServiceType;
}

export function normalizePricingUnit(value: PricingUnit | number | string): PricingUnit {
  if (typeof value === 'number') {
    return PRICING_UNIT_FROM_INDEX[value] ?? (String(value) as PricingUnit);
  }
  const n = Number(value);
  if (!isNaN(n) && PRICING_UNIT_FROM_INDEX[n] !== undefined) {
    return PRICING_UNIT_FROM_INDEX[n];
  }
  return value as PricingUnit;
}

export function serviceTypeI18nKey(value: ServiceType | number | string): string {
  return SERVICE_TYPE_I18N[normalizeServiceType(value)] ?? String(value);
}

export function pricingUnitI18nKey(value: PricingUnit | number | string): string {
  return PRICING_UNIT_I18N[normalizePricingUnit(value)] ?? String(value);
}

@Pipe({ name: 'serviceType', standalone: true })
export class ServiceTypePipe implements PipeTransform {
  transform(value: ServiceType | number | string | null | undefined): string {
    if (value == null) return '';
    return serviceTypeI18nKey(value);
  }
}

@Pipe({ name: 'pricingUnit', standalone: true })
export class PricingUnitPipe implements PipeTransform {
  transform(value: PricingUnit | number | string | null | undefined): string {
    if (value == null) return '';
    return pricingUnitI18nKey(value);
  }
}
