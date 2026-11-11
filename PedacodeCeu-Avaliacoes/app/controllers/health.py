from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.database import banco_ok
from app.events.assinante import estado
from app.redis_client import redis_ok
from app.schemas import HealthDTO

router = APIRouter(prefix="/avaliacoes", tags=["Saúde"])


@router.get(
    "/health",
    response_model=HealthDTO,
    summary="Saúde do serviço",
    description="Usado pelo healthcheck do Docker. 503 se o banco estiver fora. "
                "Redis fora deixa o serviço 'degradado' (sem cache e sem eventos), mas ainda no ar.",
)
async def health():
    banco = await banco_ok()
    redis = await redis_ok()
    corpo = HealthDTO(
        status="ok" if banco and redis else ("degradado" if banco else "fora"),
        banco=banco,
        redis=redis,
        assinante_eventos=estado["inscrito"],
    )
    return JSONResponse(status_code=200 if banco else 503, content=corpo.model_dump(by_alias=True))
