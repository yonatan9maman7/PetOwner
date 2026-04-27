import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import { shouldToastApiError } from "../services/apiErrorToast";

jest.mock("../i18n", () => ({
  translate: (key: string) => `t:${key}`,
}));

describe("shouldToastApiError", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns false for GET /providers/me with 404 (not a provider yet)", () => {
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    const err = {
      response: { status: 404 },
    } as AxiosError;
    const cfg = { method: "get", url: "/providers/me" } as InternalAxiosRequestConfig;
    expect(shouldToastApiError(err, cfg)).toBe(false);
  });

  it("returns true for GET /providers/me with 500", () => {
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    const err = {
      response: { status: 500 },
    } as AxiosError;
    const cfg = { method: "get", url: "/providers/me" } as InternalAxiosRequestConfig;
    expect(shouldToastApiError(err, cfg)).toBe(true);
  });

  it("returns true for GET /providers/me/schedule with 404", () => {
    jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
    const err = {
      response: { status: 404 },
    } as AxiosError;
    const cfg = {
      method: "get",
      url: "/providers/me/schedule",
    } as InternalAxiosRequestConfig;
    expect(shouldToastApiError(err, cfg)).toBe(true);
  });
});
