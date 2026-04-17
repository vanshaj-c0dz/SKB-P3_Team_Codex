from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


def _ensure_asyncpg_scheme(database_url: str) -> str:
	"""Normalize DB URL so SQLAlchemy async engine always uses asyncpg."""
	if database_url.startswith("postgresql+asyncpg://"):
		return database_url
	if database_url.startswith("postgresql://"):
		return database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
	if database_url.startswith("postgres://"):
		return database_url.replace("postgres://", "postgresql+asyncpg://", 1)
	return database_url


DATABASE_URL: str = _ensure_asyncpg_scheme(settings.database_url)

engine: AsyncEngine = create_async_engine(
	DATABASE_URL,
	echo=False,
	pool_pre_ping=True,
)

AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
	bind=engine,
	class_=AsyncSession,
	expire_on_commit=False,
	autoflush=False,
	autocommit=False,
)


class Base(DeclarativeBase):
	pass


async def get_db() -> AsyncIterator[AsyncSession]:
	async with AsyncSessionLocal() as session:
		yield session
