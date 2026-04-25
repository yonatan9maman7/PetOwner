import axios, { type AxiosError } from "axios";
import {
  isConnectivityAxiosError,
  getApiErrorMessage,
  normalizeApiError,
  attachNormalizedApiError,
  getNormalizedApiError,
} from "../utils/apiUtils";

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
        response: { status: 400, data: { message: "Server says no" } },
        config: { headers: {} },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("Server says no");
    });

    it("returns connectivity copy for ERR_NETWORK", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        code: "ERR_NETWORK",
        message: "Network Error",
        response: undefined,
        request: {},
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("t:apiNetworkTimeout");
    });

    it("falls back to Error.message for non-axios errors", () => {
      expect(getApiErrorMessage(new Error("plain"))).toBe("plain");
    });

    it("uses generic translated fallback for unknown errors", () => {
      expect(getApiErrorMessage({})).toBe("t:genericErrorDesc");
    });

    it("uses ProblemDetails.detail when no message", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        response: {
          status: 500,
          data: {
            title: "An unexpected error occurred.",
            detail: "The server encountered an unexpected error.",
            status: 500,
            traceId: "abc-123",
          },
        },
        config: { headers: {} },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("The server encountered an unexpected error.");
    });

    it("flattens ASP.NET validation errors dictionary", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        response: {
          status: 400,
          data: {
            errors: {
              Email: ["Invalid email"],
              Name: ["Required"],
            },
          },
        },
        config: { headers: {} },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toContain("Invalid email");
      expect(getApiErrorMessage(err)).toContain("Required");
    });

    it("uses status fallback when body is empty", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        response: { status: 404, data: {} },
        config: { headers: {} },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("t:apiErrorNotFound");
    });
  });

  describe("getNormalizedApiError", () => {
    it("returns attached normalized object", () => {
      const err = new Error("x");
      const n = normalizeApiError(err);
      attachNormalizedApiError(err, { ...n, message: "attached" });
      expect(getNormalizedApiError(err).message).toBe("attached");
    });
  });
});
