import axios, { type AxiosError } from "axios";
import { isConnectivityAxiosError, getApiErrorMessage } from "../utils/apiUtils";

jest.mock("../i18n", () => ({
  translate: (key: string) => `t:${key}`,
}));

describe("apiUtils", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("isConnectivityAxiosError", () => {
    it("returns false for non-axios errors", () => {
      expect(isConnectivityAxiosError(new Error("x"))).toBe(false);
    });

    it("returns true for ECONNABORTED axios errors", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = { code: "ECONNABORTED" } as AxiosError;
      expect(isConnectivityAxiosError(err)).toBe(true);
    });

    it("returns true when there is a request but no response", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = { request: {}, response: undefined } as AxiosError;
      expect(isConnectivityAxiosError(err)).toBe(true);
    });
  });

  describe("getApiErrorMessage", () => {
    it("prefers response.data.message when present", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        response: { data: { message: "Server says no" } },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("Server says no");
    });

    it("returns connectivity copy for ERR_NETWORK", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        code: "ERR_NETWORK",
        message: "Network Error",
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("t:apiNetworkTimeout");
    });

    it("falls back to Error.message for non-axios errors", () => {
      expect(getApiErrorMessage(new Error("plain"))).toBe("plain");
    });

    it("uses generic translated fallback for unknown errors", () => {
      expect(getApiErrorMessage({})).toBe("t:genericErrorDesc");
    });
  });
});
