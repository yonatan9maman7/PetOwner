import axios, { type AxiosError } from "axios";
import {
  isConnectivityAxiosError,
  getApiErrorMessage,
  normalizeApiError,
  attachNormalizedApiError,
  getNormalizedApiError,
  markApiErrorHandledByInterceptor,
  isApiErrorHandledByInterceptor,
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

    it("translates SOS_COOLDOWN instead of English API message", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        response: {
          status: 400,
          data: {
            message: "You can only send one SOS report every 24 hours.",
            code: "SOS_COOLDOWN",
          },
        },
        config: { headers: {} },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("t:sosCooldownError");
    });

    it("translates PET_ALREADY_LOST instead of English API message", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        response: {
          status: 400,
          data: {
            message: "Pet is already reported as lost.",
            code: "PET_ALREADY_LOST",
          },
        },
        config: { headers: {} },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("t:petAlreadyLost");
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

    it("uses friendly server copy for 500 instead of ProblemDetails.detail", () => {
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
      expect(getApiErrorMessage(err)).toBe("t:apiErrorServer");
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

    it("prefers server fallback over raw Axios message for 500", () => {
      jest.spyOn(axios, "isAxiosError").mockReturnValue(true);
      const err = {
        message: "Request failed with status code 500",
        response: { status: 500, data: {} },
        config: { headers: {} },
      } as AxiosError;
      expect(getApiErrorMessage(err)).toBe("t:apiErrorServer");
    });
  });

  describe("api error handled flag", () => {
    it("marks and detects interceptor-handled errors", () => {
      const err = { response: { status: 500 } };
      expect(isApiErrorHandledByInterceptor(err)).toBe(false);
      markApiErrorHandledByInterceptor(err);
      expect(isApiErrorHandledByInterceptor(err)).toBe(true);
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
