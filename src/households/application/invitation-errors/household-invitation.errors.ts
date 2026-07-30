export class HouseholdInvitationNotFoundError extends Error {
  constructor() {
    super('Household invitation not found.');
    this.name = HouseholdInvitationNotFoundError.name;
  }
}

export class HouseholdInvitationAlreadyExistsError extends Error {
  constructor() {
    super('A pending invitation already exists for this email.');
    this.name = HouseholdInvitationAlreadyExistsError.name;
  }
}

export class HouseholdInvitationAlreadyMemberError extends Error {
  constructor() {
    super('The user is already an active household member.');
    this.name = HouseholdInvitationAlreadyMemberError.name;
  }
}

export class HouseholdInvitationExpiredError extends Error {
  constructor() {
    super('Household invitation has expired.');
    this.name = HouseholdInvitationExpiredError.name;
  }
}

export class HouseholdInvitationEmailMismatchError extends Error {
  constructor() {
    super('The authenticated email does not match the invitation.');
    this.name = HouseholdInvitationEmailMismatchError.name;
  }
}

export class HouseholdInvitationAlreadyHandledError extends Error {
  constructor() {
    super('Household invitation has already been handled.');
    this.name = HouseholdInvitationAlreadyHandledError.name;
  }
}
