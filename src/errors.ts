export enum ErrorCode {
  MODALITY_NOT_SUPPORTED = 'MODALITY_NOT_SUPPORTED',
  HOST_NOT_FOUND = 'HOST_NOT_FOUND',
  MODEL_NOT_FOUND = 'MODEL_NOT_FOUND',
}

export class ModalityNotSupportedError extends Error {
  constructor(modality: string) {
    super(ErrorCode.MODALITY_NOT_SUPPORTED, { cause: modality });
  }
}

export class ModelNotFoundError extends Error {
  constructor(model: string) {
    super(ErrorCode.MODEL_NOT_FOUND, { cause: model });
  }
}

export class HostNotFoundError extends Error {
  constructor(host: string) {
    super(`No client found for host ${host}`);
  }
}