from fastapi import HTTPException, status


class APIException(HTTPException):
    """Base API exception."""

    pass


class LLMServiceException(APIException):
    """LLM service related exceptions."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"LLM Service Error: {detail}",
        )


class VectorDBException(APIException):
    """Vector database related exceptions."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Vector DB Error: {detail}",
        )


class ValidationException(APIException):
    """Request validation exceptions."""

    def __init__(self, detail: str):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Validation Error: {detail}",
        )
