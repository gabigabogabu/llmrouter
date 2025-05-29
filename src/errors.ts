export enum ErrorCode {
  MODALITY_NOT_SUPPORTED = 'MODALITY_NOT_SUPPORTED',
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