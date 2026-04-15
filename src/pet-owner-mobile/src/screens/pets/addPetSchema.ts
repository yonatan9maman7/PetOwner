import { z } from "zod";

export type AddPetMicrochipSchemaMessages = {
  validationMicrochipLength: string;
};

/** ISO-style pet microchip: optional; if present, exactly 15 digits (no spaces). */
export function createAddPetMicrochipSchema(msgs: AddPetMicrochipSchemaMessages) {
  return z.object({
    microchipNumber: z
      .string()
      .trim()
      .superRefine((val, ctx) => {
        if (val.length === 0) return;
        if (!/^\d{15}$/.test(val)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: msgs.validationMicrochipLength,
          });
        }
      }),
  });
}

export type AddPetMicrochipFormValues = z.infer<
  ReturnType<typeof createAddPetMicrochipSchema>
>;
